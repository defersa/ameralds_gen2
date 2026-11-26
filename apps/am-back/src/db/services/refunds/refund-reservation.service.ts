import { INT32_MAX } from '@ameralds/utils';
import { ModelState } from '@am-back/db/abstract/abstract.model';
import type { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { UserOrderRepository } from '@am-back/db/service/order/repositories/user-order.repository';
import { invalidPayment } from '@am-back/db/service/payment/errors/payment-errors';
import { PAYMENT_PROVIDER, type PaymentProvider } from '@am-back/db/service/payment/types/payment-provider';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { RefundRepository } from './repositories/refund.repository';
import { refundUnavailableReason } from './refund-eligibility';


export interface RefundReservation {
    refund: RefundEntity;
    created: boolean;
}

@Injectable()
export class RefundReservationService {
    /** Подключает транзакцию, журнал, блокировки владельца и текущий адаптер провайдера. */
    constructor(
        private readonly source: DataSource,
        private readonly refunds: RefundRepository,
        private readonly orders: UserOrderRepository,
        @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    ) {}

    /**
     * Резервирует полный возврат по серверному snapshot либо возвращает существующий активный результат.
     * Требует действующего администратора, одного однозначного списания и оплаченного не-legacy заказа.
     * Перед внешним вызовом сохраняет UUID и денежные параметры; некорректное состояние и финансовый инцидент блокируют новый запрос.
     */
    public async reserve(actorId: number, orderId: number, reason: string): Promise<RefundReservation> {
        if (![actorId, orderId]
            .every((id) => Number.isInteger(id) && id > 0 && id <= INT32_MAX) ||
            typeof reason !== 'string' || !reason.trim() || reason.length > 2000) {
            invalidPayment();
        }

        const userId = await this.refunds.findOwnerId(orderId);

        if (!userId) {
            invalidPayment();
        }

        return this.source.transaction(async (manager) => {
            if (!await this.refunds.isAdministrator(actorId, manager)) {
                throw new ForbiddenException();
            }

            await this.orders.lockOwner(userId, manager);

            const order = await this.orders.lockForPayment(orderId, userId, manager);

            if (!order || order.state !== ModelState.ACTIVE || order.sourceAdminOrder) {
                invalidPayment();
            }

            const existing = await this.refunds.findBlocking(orderId, manager);

            if (existing) {
                return { refund: existing, created: false };
            }

            if (await this.refunds.hasIncident(orderId, manager)) {
                invalidPayment();
            }

            const payments = await this.refunds.successfulPayments(orderId, manager);
            const payment = payments[0];

            if (refundUnavailableReason(order, payments, this.provider.name)) {
                invalidPayment();
            }

            const now = await this.orders.databaseTime(manager);

            const refund = await this.refunds.reserve({
                orderId,
                paymentId: payment.id,
                initiatedBy: actorId,
                reason: reason.trim(),
                amount: payment.amount,
                currency: payment.currency,
                provider: payment.provider,
                idempotencyKey: randomUUID(),
                status: 'accepted',
                transitions: [{ status: 'accepted', at: now.toISOString(), error: null }],
                nextCheckAt: now,
            }, manager);

            return { refund, created: true };
        });
    }
}
