import { PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { UserOrderRepository } from '@am-back/db/service/order/repositories/user-order.repository';
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderRefund } from '@am-back/db/service/payment/types/payment-provider';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { RefundDiscoveryRepository } from './repositories/refund-discovery.repository';
import { RefundRepository } from './repositories/refund.repository';
import { RefundResultService } from './refund-result.service';


const REFUND_CURRENCIES = new Set<string>(['RUB', 'USD']);
const REFUND_STATES = new Set<string>(['unknown', 'pending', 'succeeded', 'failed']);

@Injectable()
export class RefundDiscoveryService {
    private readonly logger = new Logger(RefundDiscoveryService.name);

    /** Подключает доверенный адаптер, журнал, общий порядок блокировок и обработчик подтверждённого результата. */
    constructor(
        private readonly source: DataSource,
        private readonly discovery: RefundDiscoveryRepository,
        private readonly refunds: RefundRepository,
        private readonly orders: UserOrderRepository,
        private readonly results: RefundResultService,
        @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    ) {}

    /**
     * Учитывает результат, перечитанный через API провайдера, без нового запроса на движение денег.
     * Привязывает полный внешний возврат к журналу; расхождения сохраняет как инцидент без изменения прав.
     */
    public async observe(provider: string, result: ProviderRefund): Promise<void> {
        if (provider !== this.provider.name || !result.externalId || result.externalId.length > 255 ||
            !result.paymentExternalId || !Number.isSafeInteger(result.amount) || result.amount <= 0 ||
            !REFUND_CURRENCIES.has(result.currency) || !REFUND_STATES.has(result.status)) {
            throw new Error('Invalid refund observation');
        }

        const original = await this.discovery.findPayment(provider, result.paymentExternalId);
        const userId = original?.order?.user?.id;

        if (!original || !userId || !original.orderId) {
            throw new Error('Refund payment or owner unavailable');
        }

        const refundId = await this.source.transaction(async manager => {
            await this.orders.lockOwner(userId, manager);

            const order = await this.orders.lockForPayment(original.orderId, userId, manager, true);
            const payment = await this.discovery.lockPayment(original.id, manager);

            if (!order || payment.status !== PaymentStatus.SUCCEEDED || payment.amount === null || payment.currency === null ||
                payment.orderId !== order.id || payment.provider !== provider || payment.externalId !== result.paymentExternalId) {
                throw new Error('Refund payment mismatch');
            }

            const known = await this.discovery.findOperation(provider, result, manager);

            if (known && known.paymentId !== payment.id) {
                throw new Error('Refund belongs to a different payment');
            }

            if (result.amount !== payment.amount || result.currency !== payment.currency ||
                payment.resolution !== 'completed' || order.totalAmount !== payment.amount || order.currency !== payment.currency ||
                order.sourceAdminOrder) {
                const kind = result.currency === payment.currency && result.amount < payment.amount
                    ? 'partial_refund' : 'unexpected_refund';

                await this.discovery.recordIncident(payment, result, kind, manager);

                return null;
            }

            if (await this.refunds.hasIncident(order.id, manager)) {
                await this.discovery.recordIncident(payment, result, 'conflicting_refund', manager);

                return null;
            }

            if (known) {
                if ((known.externalId !== null && known.externalId !== result.externalId) ||
                    (known.origin !== 'provider' && known.idempotencyKey !== result.idempotencyKey) ||
                    (known.status === 'failed' && result.status === 'succeeded')) {
                    await this.discovery.recordIncident(payment, result, 'conflicting_refund', manager);

                    return null;
                }

                return known.id;
            }

            if (order.status !== OrderStatus.PAID || await this.refunds.findBlocking(order.id, manager)) {
                await this.discovery.recordIncident(payment, result, 'conflicting_refund', manager);

                return null;
            }

            const now = await this.orders.databaseTime(manager);

            const refund = await this.refunds.reserve({
                orderId: order.id,
                paymentId: payment.id,
                origin: 'provider',
                initiatedBy: null,
                reason: 'Возврат в кабинете платёжного провайдера',
                provider,
                externalId: result.externalId,
                idempotencyKey: randomUUID(),
                amount: payment.amount,
                currency: payment.currency,
                status: 'unknown',
                transitions: [{ status: 'unknown', at: now.toISOString(), error: null }],
                nextCheckAt: now,
            }, manager);

            return refund.id;
        });

        if (refundId !== null) {
            // Сбой между записью внешней операции и финализацией восстанавливается существующей сверкой unknown.
            await this.results.apply(refundId, result);
        }
    }

    /** Обнаруживает возвраты без webhook равномерным обходом всех успешных платежей, включая старые. */
    @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
    public async reconcile(): Promise<void> {
        const payments = await this.discovery.duePayments(this.provider.name, 20);

        for (const payment of payments) {
            if (!payment.externalId || !await this.discovery.claimPayment(payment.id)) {
                continue;
            }

            try {
                const results = await this.boundedList(payment.externalId);

                let complete = true;

                for (const result of results) {
                    try {
                        if (result.paymentExternalId !== payment.externalId) {
                            throw new Error('Refund list contains another payment');
                        }

                        await this.observe(this.provider.name, result);
                    } catch {
                        complete = false;
                        this.logger.warn({ event: 'external_refund_observation_failed', paymentId: payment.id });
                    }
                }

                if (complete) {
                    await this.discovery.finishPayment(payment.id);
                }
            } catch {
                this.logger.warn({ event: 'external_refund_reconciliation_failed', paymentId: payment.id });
            }
        }
    }

    /** Ограничивает полный обход страниц провайдера десятью секундами; ошибка оставляет платёж для повтора. */
    private async boundedList(paymentExternalId: string): Promise<ProviderRefund[]> {
        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
            return await Promise.race([
                this.provider.listRefunds(paymentExternalId),
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => reject(new Error('Refund discovery timeout')), 10_000);
                }),
            ]);
        } finally {
            clearTimeout(timer);
        }
    }
}
