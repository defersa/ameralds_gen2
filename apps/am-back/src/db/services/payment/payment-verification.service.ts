import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import type { PaymentStateDto } from '@am-back/modules/orders/dto/payment.dto';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserOrderRepository } from '../order/repositories/user-order.repository';
import { invalidPayment, paymentUnavailable } from './errors/payment-errors';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PAYMENT_PROVIDER, ProviderPaymentStatus, type PaymentProvider, type ProviderPayment } from './types/payment-provider';
import { INT32_MAX } from '@ameralds/utils';


@Injectable()
export class PaymentVerificationService {
    private readonly logger = new Logger(PaymentVerificationService.name);

    /** Подключает общий обработчик и адаптер; сетевые запросы выполняются без транзакционных блокировок. */
    constructor(
        private readonly orders: UserOrderRepository,
        private readonly payments: PaymentRepository,
        private readonly service: PaymentService,
        @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
        private readonly config: ConfigService,
    ) {}

    /** Возвращает только состояние собственного заказа; сверка ограничена общей арендой попытки и HTTP rate limit. */
    public async getState(userId: number, orderId: number): Promise<PaymentStateDto> {
        if (!Number.isInteger(orderId) || orderId < 1 || orderId > INT32_MAX) {
            invalidPayment();
        }

        const order = await this.orders.findPlacedOrder(userId, orderId);

        if (!order) {
            invalidPayment();
        }

        let payment = await this.payments.latest(orderId);

        if (payment && payment.provider === this.provider.name && !payment.resolution &&
            order.status !== OrderStatus.REFUNDED && order.status !== OrderStatus.PARTIALLY_REFUNDED) {
            await this.verify(payment.id);
            payment = await this.payments.latest(orderId);
        }

        const current = await this.orders.findPlacedOrder(userId, orderId);

        if (!current) {
            invalidPayment();
        }

        return {
            orderId,
            orderStatus: current.status,
            paymentStatus: payment?.status ?? null,
            resolution: payment?.resolution ?? null,
            checkedAt: payment?.checkedAt ?? null,
            verificationUnavailable: payment?.errorCode === 'verification_unavailable',
        };
    }

    /** Подтверждает доставку только после проверки подписи, чтения API и коммита результата; ошибка допускает повтор webhook. */
    public async webhook(provider: string, payload: unknown, signature: string | undefined): Promise<void> {
        if (provider !== this.provider.name || !this.provider.verifyWebhook) {
            throw new UnauthorizedException();
        }

        const externalId = await this.provider.verifyWebhook(payload, signature);
        const payment = await this.payments.findByExternal(provider, externalId);

        if (!payment) {
            // Создание могло ещё не сохранить внешний ID; провайдер должен повторить доставку.
            paymentUnavailable();
        }

        if (!await this.verify(payment.id, true)) {
            paymentUnavailable();
        }
    }

    /**
     * Сверяет реальный статус и восстанавливает потерянный ответ create прежним ключом; ошибки сохраняют backoff.
     * Отменяет только незавершённые попытки: уже полученное списание передаётся в общий обработчик без запроса отмены.
     */
    public async verify(paymentId: number, webhook = false, cancel = false): Promise<boolean> {
        const payment = await this.payments.findForVerification(paymentId);

        if (!payment || payment.provider !== this.provider.name || !payment.order?.user || !payment.orderId ||
            !payment.idempotencyKey || payment.amount === null || payment.currency === null) {
            return false;
        }

        if (!webhook && !cancel && !await this.payments.claimCheck(paymentId, 15_000)) {
            return true;
        }

        try {
            let result: ProviderPayment;

            if (payment.externalId) {
                result = await this.bounded(this.provider.getPayment(payment.externalId));
            } else {
                // Повторяем только уже зарезервированную попытку; отмена заказа не теряет неизвестный финансовый результат.
                result = await this.bounded(this.provider.createPayment({
                    idempotencyKey: payment.idempotencyKey,
                    orderId: payment.orderId,
                    amount: payment.amount,
                    currency: payment.currency,
                    returnUrl: this.returnUrl(payment.orderId),
                }));
            }

            if ((cancel || payment.order.status === OrderStatus.CANCELLED) &&
                (result.status === ProviderPaymentStatus.PENDING || result.status === ProviderPaymentStatus.AUTHORIZED ||
                    result.status === ProviderPaymentStatus.UNKNOWN)) {
                result = await this.bounded(this.provider.cancelPayment(result.externalId));
            }

            await this.service.processPaymentResult(payment.order.user.id, payment.orderId, payment.id, result);

            return true;
        } catch {
            await this.payments.deferCheck(payment.id, payment.checkFailures + 1);
            this.logger.warn({
                paymentId,
                event: 'payment_verification_failed',
            });

            return false;
        }
    }

    /** Раз в минуту выбирает ограниченную порцию; отсутствие webhook не оставляет PENDING навсегда без сверки. */
    @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
    public async reconcile(): Promise<void> {
        const batch = this.positiveSetting('PAYMENT_RECONCILE_BATCH', 50, 500);
        const days = this.positiveSetting('PAYMENT_TERMINAL_RECHECK_DAYS', 7, 365);
        const stuckHours = this.positiveSetting('PAYMENT_STUCK_AFTER_HOURS', 24, 8760);
        const due = await this.payments.dueChecks(this.provider.name, batch, days);

        for (const payment of due) {
            if (payment.status === PaymentStatus.PENDING && Date.now() - payment.createdAt.getTime() > stuckHours * 3_600_000) {
                this.logger.warn({
                    paymentId: payment.id,
                    event: 'payment_stuck',
                });
            }

            await this.verify(payment.id);
        }
    }

    /** Читает ограниченные положительные настройки нагрузки; некорректная конфигурация использует безопасное значение. */
    private positiveSetting(name: string, fallback: number, maximum: number): number {
        const value = Number(this.config.get<string>(name));

        return Number.isInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
    }

    /** Формирует доверенный адрес возврата для восстановления ответа создания по исходному ключу. */
    private returnUrl(orderId: number): string {
        const origin = this.config.get<string>('SITE_URL') ||
            (this.config.get<string>('NODE_ENV') === 'dev' ? 'http://localhost:4400' : '');

        return new URL(`/account/orders/${orderId}`, origin).toString();
    }

    /** Ограничивает один вызов API десятью секундами и освобождает таймер при любом исходе. */
    private async bounded<T>(request: Promise<T>): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
            return await Promise.race([
                request,
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => reject(new Error('Provider timeout')), 10_000);
                }),
            ]);
        } finally {
            clearTimeout(timer);
        }
    }
}
