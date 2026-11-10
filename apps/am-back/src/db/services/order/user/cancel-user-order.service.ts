import { ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import type { UserOrderSummaryDto } from '@am-back/modules/orders/dto/user-orders-list.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { USER_CANCELLED_REASON } from '../checkout/payment-window';
import { invalidOrder } from '../errors/order-validation';
import { toUserOrderSummary } from '../mappers/order.mapper';
import { UserOrderRepository } from '../repositories/user-order.repository';


@Injectable()
export class CancelUserOrderService {
    /** Подключает транзакции и репозиторий для безопасного изменения состояния собственного заказа. */
    constructor(
        private readonly dataSource: DataSource,
        private readonly orders: UserOrderRepository,
    ) {}

    /**
     * Отменяет собственный активный PENDING_PAYMENT с блокировкой пользователя перед заказом.
     * Повтор для отменённого заказа возвращает прежние реквизиты. Чужой, отсутствующий или неактивный
     * заказ даёт NOT_EXIST; корзина, оплаченный заказ, возврат или административный источник — INVALID.
     */
    public cancel(userId: number, orderId: number): Promise<UserOrderSummaryDto> {
        return this.dataSource.transaction(async manager => {
            await this.orders.lockOwner(userId, manager);

            const order = await this.orders.lockForPayment(orderId, userId, manager);

            if (!order) {
                throw new BadRequestException({
                    code: ApiErrorCodes.NOT_EXIST,
                    entity: ApiEntityNames.CART,
                });
            }

            if (order.sourceAdminOrder) {
                invalidOrder();
            }

            if (order.status === OrderStatus.CANCELLED) {
                return toUserOrderSummary(order);
            }

            if (order.status !== OrderStatus.PENDING_PAYMENT) {
                invalidOrder();
            }

            const now = await this.orders.databaseTime(manager);
            const cancelled = await this.orders.cancelPendingByOwner(order.id, userId, now, manager);

            if (!cancelled) {
                invalidOrder();
            }

            return toUserOrderSummary({
                ...order,
                status: OrderStatus.CANCELLED,
                cancelledAt: now,
                cancelReason: USER_CANCELLED_REASON,
                updatedAt: now,
            });
        });
    }
}
