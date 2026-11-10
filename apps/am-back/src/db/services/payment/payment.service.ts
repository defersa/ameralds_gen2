import { INT32_MAX, ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { OrderStatus, type UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, type UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import type { PaymentAttemptDto } from '@am-back/modules/orders/dto/payment.dto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryFailedError } from 'typeorm';
import { UserOrderRepository } from '../order/repositories/user-order.repository';
import { invalidPayment, paymentConflict, paymentUnavailable } from './errors/payment-errors';
import { PaymentRepository } from './repositories/payment.repository';
import {
    PAYMENT_PROVIDER,
    ProviderPaymentStatus,
    type PaymentProvider,
    type ProviderPayment,
} from './types/payment-provider';


@Injectable()
export class PaymentService {
    /** Подключает границы транзакций, репозитории заказов/попыток и заменяемый адаптер провайдера. */
    constructor(
        private readonly source: DataSource,
        private readonly orders: UserOrderRepository,
        private readonly payments: PaymentRepository,
        @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
        private readonly config: ConfigService,
    ) {}

    /**
     * Создаёт либо восстанавливает попытку владельца с серверной суммой. Резерв коммитится до внешнего запроса;
     * таймаут оставляет прежний ключ и PENDING. Финансовый результат не выдаёт права и не завершает заказ (AMS-12).
     */
    public async createPayment(userId: number, orderId: number, key: string): Promise<PaymentAttemptDto> {
        if (this.provider.name === 'mock' && !['dev', 'test']
            .includes(this.config.get<string>('NODE_ENV') ?? '')) {
            paymentUnavailable();
        }

        if (
            !Number.isInteger(orderId) ||
            orderId < 1 ||
            orderId > INT32_MAX ||
            typeof key !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
        ) {
            invalidPayment();
        }

        const payment = await this.source
            .transaction(async (manager) => {
                await this.orders.lockOwner(userId, manager);

                const order = await this.orders.lockForPayment(orderId, userId, manager);
                const now = await this.orders.databaseTime(manager);

                this.validateOrder(order, now);

                const previous = await this.payments.findByKey(key, manager);

                if (previous) {
                    if (previous.orderId !== order.id || previous.provider !== this.provider.name) {
                        paymentConflict();
                    }

                    return previous;
                }

                const active = await this.payments.findBlocking(order.id, manager);

                if (active) {
                    if (active.status === PaymentStatus.SUCCEEDED || active.provider !== this.provider.name) {
                        paymentConflict();
                    }

                    await this.payments.bindKey(key, active.id, manager);

                    return active;
                }

                return this.payments.reserve(
                    order.id,
                    key,
                    this.provider.name,
                    order.totalAmount,
                    order.currency,
                    manager,
                );
            })
            .catch((error: unknown) => {
                if (
                    error instanceof QueryFailedError &&
                    'code' in error.driverError &&
                    error.driverError.code === '23505'
                ) {
                    paymentConflict();
                }

                throw error;
            });

        if (payment.status !== PaymentStatus.PENDING) {
            return this.toDto(payment);
        }

        if (
            !payment.idempotencyKey ||
            payment.amount === null ||
            payment.currency === null ||
            payment.orderId === null
        ) {
            invalidPayment();
        }

        let result: ProviderPayment;

        try {
            result = await this.withTimeout(
                this.provider.createPayment({
                    idempotencyKey: payment.idempotencyKey,
                    orderId: payment.orderId,
                    amount: payment.amount,
                    currency: payment.currency,
                    returnUrl: this.returnUrl(orderId),
                }),
            );
            this.validateResult(payment, result);
        } catch {
            await this.payments.recordError(payment.id, 'provider_unavailable');

            paymentUnavailable();
        }

        const saved = await this.source.transaction(async (manager) => {
            await this.orders.lockOwner(userId, manager);
            // Сохраняем финансовый аудит даже при отмене/истечении заказа во время внешнего вызова.
            const order = await this.orders.lockForPayment(orderId, userId, manager);

            const current = await this.payments.lock(payment.id, manager);
            const now = await this.orders.databaseTime(manager);

            this.validateResult(current, result);

            if (current.status !== PaymentStatus.PENDING) {
                return {
                    payment: current,
                    order,
                    now,
                };
            }

            current.externalId = result.externalId;
            current.providerStatus = result.status;
            current.checkedAt = now;
            current.errorCode = null;
            current.confirmationUrl = result.confirmationUrl;
            current.status = this.normalizeStatus(result);
            current.paidAt = current.status === PaymentStatus.SUCCEEDED ? result.paidAt : null;

            if (current.status !== PaymentStatus.PENDING) {
                current.confirmationUrl = null;
            }

            const updated = await this.payments.saveResult(current, manager);

            return {
                payment: updated,
                order,
                now,
            };
        });

        // Ошибку отменённого заказа выдаём после коммита финансового аудита, не откатывая результат провайдера.
        this.validateOrder(saved.order, saved.now);

        return this.toDto(saved.payment);
    }

    /** Проверяет владельца через результат репозитория, статус, источник, срок и безопасную положительную сумму. */
    private validateOrder(
        order: UserOrderEntity | null,
        now: Date,
    ): asserts order is UserOrderEntity & { totalAmount: number; currency: 'RUB' | 'USD' } {
        if (!order) {
            throw new BadRequestException({
                code: ApiErrorCodes.NOT_EXIST,
                entity: ApiEntityNames.PAYMENT,
            });
        }

        if (
            order.status !== OrderStatus.PENDING_PAYMENT ||
            order.sourceAdminOrder ||
            !order.placedAt ||
            !order.paymentExpiresAt ||
            order.paymentExpiresAt <= now ||
            !Number.isSafeInteger(order.totalAmount) ||
            order.totalAmount === null ||
            order.totalAmount <= 0 ||
            (order.currency !== 'RUB' && order.currency !== 'USD')
        ) {
            invalidPayment();
        }
    }

    /** Проверяет идентичность, денежный snapshot и финальное списание, не доверяя одному названию статуса адаптера. */
    private validateResult(payment: UserPaymentEntity, result: ProviderPayment): void {
        if (
            !result ||
            typeof result.externalId !== 'string' ||
            !result.externalId ||
            result.externalId.length > 255 ||
            (payment.externalId !== null &&
                payment.externalId !== undefined &&
                result.externalId !== payment.externalId) ||
            result.orderId !== payment.orderId ||
            result.amount !== payment.amount ||
            result.currency !== payment.currency ||
            !Object.values(ProviderPaymentStatus)
                .includes(result.status) ||
            (result.status === ProviderPaymentStatus.SUCCEEDED &&
                (result.captured !== true ||
                    !(result.paidAt instanceof Date) ||
                    !Number.isFinite(result.paidAt.getTime())))
        ) {
            throw new Error('Provider result does not match the reserved payment');
        }

        if (result.confirmationUrl !== null) {
            const url = new URL(result.confirmationUrl);
            const environment = this.config.get<string>('NODE_ENV');
            const local = environment === 'dev' || environment === 'test';

            if (
                url.username ||
                url.password ||
                (url.protocol !== 'https:' &&
                    !(local && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]']
                        .includes(url.hostname)))
            ) {
                throw new Error('Unsafe provider confirmation URL');
            }
        }
    }

    /** Различает авторизацию и списание; промежуточная авторизация остаётся PENDING. */
    private normalizeStatus(result: ProviderPayment): PaymentStatus {
        switch (result.status) {
            case ProviderPaymentStatus.SUCCEEDED:
                return PaymentStatus.SUCCEEDED;
            case ProviderPaymentStatus.FAILED:
                return PaymentStatus.FAILED;
            case ProviderPaymentStatus.CANCELLED:
                return PaymentStatus.CANCELLED;
            default:
                return PaymentStatus.PENDING;
        }
    }

    /** Формирует return URL только из серверной конфигурации; клиент не может подставить сторонний адрес. */
    private returnUrl(orderId: number): string {
        const origin =
            this.config.get<string>('SITE_URL') ||
            (this.config.get<string>('NODE_ENV') === 'dev' ? 'http://localhost:4400' : '');
        const url = new URL(`/account/orders/${orderId}`, origin);

        if (
            url.protocol !== 'https:' &&
            !(['dev', 'test']
                .includes(this.config.get<string>('NODE_ENV') ?? '') && url.protocol === 'http:')
        ) {
            throw new Error('Invalid SITE_URL');
        }

        return url.toString();
    }

    /** Ограничивает ожидание провайдера 10 секундами; поздний ответ восстанавливается повтором с прежним ключом. */
    private async withTimeout<T>(request: Promise<T>): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
            return await Promise.race([
                request,
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => reject(new Error('Payment provider timeout')), 10_000);
                }),
            ]);
        } finally {
            clearTimeout(timer);
        }
    }

    /** Выдаёт безопасный DTO без внешних идентификаторов, ключа идемпотентности и служебных ошибок. */
    private toDto(payment: UserPaymentEntity): PaymentAttemptDto {
        if (
            payment.orderId === null ||
            payment.amount === null ||
            payment.currency === null ||
            payment.status === null
        ) {
            invalidPayment();
        }

        return {
            id: payment.id,
            orderId: payment.orderId,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            confirmationUrl: payment.confirmationUrl ?? null,
            createdAt: payment.createdAt,
            paidAt: payment.paidAt ?? null,
            testMode: payment.provider === 'mock',
        };
    }
}
