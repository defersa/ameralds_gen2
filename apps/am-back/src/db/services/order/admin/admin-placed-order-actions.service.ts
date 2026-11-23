import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { PaymentCompletionRepository } from '@am-back/db/service/payment/repositories/payment-completion.repository';
import { RefundReservationService } from '@am-back/db/service/refunds/refund-reservation.service';
import { RefundRepository } from '@am-back/db/service/refunds/repositories/refund.repository';
import type { AdminPlacedOrderDetailsDto } from '@am-back/modules/admin/dto/admin-placed-order.dto';
import { invalidOrder } from '../errors/order-validation';
import { AdminPlacedOrderRepository } from '../repositories/admin-placed-order.repository';
import { UserOrderRepository } from '../repositories/user-order.repository';
import { AdminPlacedOrdersService } from './admin-placed-orders.service';


@Injectable()
export class AdminPlacedOrderActionsService {
    /** Подключает транзакции, аудит отмены, существующую очередь платежей и резерв полного возврата. */
    constructor(
        private readonly source: DataSource,
        private readonly orders: UserOrderRepository,
        private readonly placed: AdminPlacedOrderRepository,
        private readonly refunds: RefundRepository,
        private readonly reservation: RefundReservationService,
        private readonly effects: PaymentCompletionRepository,
        private readonly view: AdminPlacedOrdersService,
    ) {}

    /**
     * Отменяет актуальный PENDING_PAYMENT с аудитом и outbox в одной транзакции.
     * Повтор не меняет первый аудит. Оплата и отмена сериализуются блокировками владельца и заказа;
     * позднее списание проходит существующий обработчик компенсационного инцидента.
     */
    public async cancel(actorId: number, id: number, reason: string): Promise<AdminPlacedOrderDetailsDto> {
        const userId = await this.refunds.findOwnerId(id);

        if (!userId) {
            invalidOrder();
        }

        await this.source.transaction(async (manager) => {
            if (!(await this.refunds.isAdministrator(actorId, manager))) {
                throw new ForbiddenException();
            }

            await this.orders.lockOwner(userId, manager);

            const order = await this.orders.lockForPayment(id, userId, manager);

            if (!order) {
                invalidOrder();
            }

            if (order.status === OrderStatus.CANCELLED) {
                return;
            }

            if (order.status !== OrderStatus.PENDING_PAYMENT) {
                invalidOrder();
            }

            const now = await this.orders.databaseTime(manager);

            if (!(await this.placed.cancel(id, actorId, reason, now, manager))) {
                invalidOrder();
            }

            const pending = await this.placed.pendingPayments(id, manager);

            for (const payment of pending) {
                await this.effects.enqueue('cancel_payment', id, payment.id, manager);
            }
        });

        return this.view.details(id);
    }

    /** Сохраняет полный возврат через существующий сервис; фоновый обработчик отправляет его и сверяет результат независимо от страницы. */
    public async refund(actorId: number, id: number, reason: string): Promise<AdminPlacedOrderDetailsDto> {
        await this.reservation.reserve(actorId, id, reason);

        return this.view.details(id);
    }
}
