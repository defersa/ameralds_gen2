import { OrderStatus, type UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, type UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { PatternGrantsService } from '@am-back/db/service/pattern-grants/pattern-grants.service';
import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ModelState } from '@am-back/db/abstract/abstract.model';
import { PaymentCompletionRepository } from './repositories/payment-completion.repository';
import { PaymentRepository } from './repositories/payment.repository';


@Injectable()
export class PaymentCompletionService {
    /** Подключает выдачу прав и изменения заказа/outbox в переданной транзакции результата платежа. */
    constructor(
        private readonly completion: PaymentCompletionRepository,
        private readonly payments: PaymentRepository,
        private readonly grants: PatternGrantsService,
    ) {}

    /**
     * Завершает покупку только после проверенного списания под блокировками владельца, заказа и попытки.
     * Ошибка выдачи прав откатывает весь результат. Позднее/повторное списание сохраняется с инцидентом,
     * а повтор той же успешно завершённой попытки не очищает новую корзину и не выдаёт права заново.
     */
    public async completeOrder(
        userId: number, order: UserOrderEntity, payment: UserPaymentEntity, manager: EntityManager, now: Date,
    ): Promise<void> {
        if (payment.status !== PaymentStatus.SUCCEEDED || payment.resolution) {
            return;
        }

        if (order.state !== ModelState.ACTIVE || order.status !== OrderStatus.PENDING_PAYMENT || order.sourceAdminOrder || !order.placedAt ||
            !payment.paidAt || !order.paymentExpiresAt || payment.paidAt >= order.paymentExpiresAt ||
            !await this.completion.isOwnerActive(userId, manager) ||
            await this.completion.hasOverlappingRights(userId, order.id, manager)) {
            payment.resolution = 'compensation_required';
            await this.completion.enqueue('compensation_required', order.id, payment.id, manager);

            return;
        }

        await this.completion.markPaid(order, payment.paidAt, manager);
        await this.grants.grantPaidOrder(userId, order.id, manager);

        const cancelled = await this.completion.cancelOtherOrders(userId, order.id, now, manager);
        const activePayments = await this.payments.findPendingForOrders([...cancelled, order.id], manager);

        for (const other of activePayments) {
            if (other.id !== payment.id && other.orderId !== null) {
                await this.completion.enqueue('cancel_payment', other.orderId, other.id, manager);
            }
        }

        await this.completion.clearOpenCart(userId, manager);
        await this.completion.enqueue('purchase_email', order.id, null, manager);
        payment.resolution = 'completed';
    }
}
