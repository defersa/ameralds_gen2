import { RefundEntity, type RefundStatus } from '@am-back/db/entities/purchases/refund.entity';
import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { PatternGrantsService } from '@am-back/db/service/pattern-grants/pattern-grants.service';
import { UserOrderRepository } from '@am-back/db/service/order/repositories/user-order.repository';
import { PaymentCompletionRepository } from '@am-back/db/service/payment/repositories/payment-completion.repository';
import type { ProviderRefund } from '@am-back/db/service/payment/types/payment-provider';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RefundRepository } from './repositories/refund.repository';


@Injectable()
export class RefundResultService {
    /** Подключает транзакцию, порядок блокировок, отзыв прав и очередь действий после коммита. */
    constructor(
        private readonly source: DataSource,
        private readonly orders: UserOrderRepository,
        private readonly grants: PatternGrantsService,
        private readonly effects: PaymentCompletionRepository,
        private readonly refunds: RefundRepository,
    ) {}

    /**
     * Применяет проверенный результат провайдера под блокировкой владельца, заказа, платежа и операции.
     * Успех атомарно устанавливает REFUNDED, отзывает только права этого заказа и создаёт письмо.
     * Неизвестный результат, отказ и неразрешённый финансовый инцидент сохраняют доступ. Некорректные данные отклоняются без изменения БД.
     */
    public async apply(refundId: number, result: ProviderRefund): Promise<RefundEntity> {
        // Начальное чтение определяет владельца; финансовые поля и право доступа проверяются после блокировок.
        const original = await this.source.getRepository(RefundEntity).findOne({
            where: { id: refundId },
            relations: { order: { user: true } },
        });

        if (!original?.order?.user?.id) {
            throw new Error('Refund owner unavailable');
        }

        const userId = original.order.user.id;

        return this.source.transaction(async (manager) => {
            await this.orders.lockOwner(userId, manager);

            const order = await this.orders.lockForPayment(original.orderId, userId, manager, true);
            // Блокируем исходный платёж после заказа, затем операцию; внешних запросов в транзакции нет.
            const payment = await manager.getRepository(UserPaymentEntity).findOne({
                where: { id: original.paymentId },
                lock: { mode: 'pessimistic_write' },
            });
            const refund = await manager.getRepository(RefundEntity).findOne({
                where: { id: refundId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!order || !payment || !refund || refund.orderId !== order.id || refund.paymentId !== payment.id ||
                payment.orderId !== order.id || payment.status !== PaymentStatus.SUCCEEDED || payment.resolution !== 'completed' ||
                !payment.externalId || refund.provider !== payment.provider || refund.amount !== payment.amount ||
                refund.currency !== payment.currency || refund.amount !== order.totalAmount || refund.currency !== order.currency ||
                result.paymentExternalId !== payment.externalId ||
                (refund.origin !== 'provider' && result.idempotencyKey !== refund.idempotencyKey) ||
                result.amount !== refund.amount || result.currency !== refund.currency || !result.externalId ||
                (refund.externalId !== null && refund.externalId !== result.externalId) ||
                !['unknown', 'pending', 'succeeded', 'failed'].includes(result.status)) {
                throw new Error('Refund provider result mismatch');
            }

            if (refund.status === 'failed' && result.status === 'succeeded') {
                throw new Error('Refund succeeded after a final failure; manual reconciliation required');
            }

            if (refund.status === 'succeeded' || refund.status === 'failed') {
                return refund;
            }

            if (order.status !== OrderStatus.PAID || order.sourceAdminOrder) {
                throw new Error('Refund order is unavailable');
            }

            const now = await this.orders.databaseTime(manager);
            const status: RefundStatus = result.status === 'pending' ? 'processing' : result.status;

            refund.externalId = result.externalId;
            refund.errorCode = null;
            refund.checkFailures = 0;
            refund.nextCheckAt = new Date(now.getTime() + 60_000);

            if (status !== refund.status) {
                refund.transitions = [...refund.transitions, { status, at: now.toISOString(), error: null }];
                refund.status = status;
            }

            if (status === 'succeeded') {
                if (await this.refunds.hasIncident(order.id, manager)) {
                    throw new Error('Refund incident requires manual reconciliation');
                }

                // Статус, отзыв и событие письма коммитятся вместе; сбой любого шага откатывает всё.
                await manager.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.REFUNDED });
                await this.grants.revokeRefundedOrder(userId, order.id, refund.initiatedBy, refund.reason, result.externalId, manager);
                await this.effects.enqueue('refund_email', order.id, payment.id, manager);
                refund.completedAt = now;
            } else if (status === 'failed') {
                refund.completedAt = now;
            }

            // Финансовый журнал изменяется внутри той же транзакции, что и права и очередь.
            return manager.getRepository(RefundEntity).save(refund);
        });
    }
}
