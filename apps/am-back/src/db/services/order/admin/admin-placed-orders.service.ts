import { ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import type {
    AdminPlacedOrderDetailsDto,
    AdminPlacedOrdersPageDto,
    AdminOrderHistoryDto,
} from '@am-back/modules/admin/dto/admin-placed-order.dto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PAYMENT_PROVIDER, type PaymentProvider } from '@am-back/db/service/payment/types/payment-provider';
import { refundUnavailableReason } from '@am-back/db/service/refunds/refund-eligibility';
import { toUserOrderDetails, toUserOrderSummary } from '../mappers/order.mapper';
import { AdminPlacedOrderRepository } from '../repositories/admin-placed-order.repository';
import type { AdminPlacedOrderFilters } from '../types/admin-placed-order-filters';


const REFUND_HISTORY_EVENTS = {
    accepted: 'Запрошен полный возврат',
    processing: 'Возврат отправлен на обработку',
    unknown: 'Результат возврата неизвестен, требуется сверка',
    succeeded: 'Возврат подтверждён',
    failed: 'Возврат отклонён',
};

@Injectable()
export class AdminPlacedOrdersService {
    /** Подключает чтение оформленных заказов и действующего провайдера для предварительной доступности возврата. */
    constructor(
        private readonly orders: AdminPlacedOrderRepository,
        @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    ) {}

    /** Возвращает серверную страницу пользовательских заказов с безопасными контактами, без административных корзин. */
    public async list(filters: AdminPlacedOrderFilters): Promise<AdminPlacedOrdersPageDto> {
        const result = await this.orders.page(filters);

        return {
            ...result,
            pageSize: filters.pageSize,
            items: result.items
                .map((order) => ({
                    ...toUserOrderSummary(order),
                    user: order.user
                        ? {
                              id: order.user.id,
                              email: order.user.email,
                          }
                        : null,
                })),
        };
    }

    /** Формирует snapshot, финансовый журнал и аудит; секреты провайдера, URL подтверждения и ключи идемпотентности исключены. */
    public async details(id: number): Promise<AdminPlacedOrderDetailsDto> {
        const snapshot = await this.orders.details(id);

        if (!snapshot) {
            throw new BadRequestException({
                code: ApiErrorCodes.NOT_EXIST,
                entity: ApiEntityNames.CART,
            });
        }

        const { order, refunds, grants } = snapshot;

        const blocking = refunds
            .find((refund) => refund.status !== 'failed');

        const payments = order.payments ?? [];

        const history: AdminOrderHistoryDto[] = payments
            .filter((payment) => payment.paidAt !== null && payment.paidAt !== undefined)
            .map((payment) => ({
                event: `Подтверждена оплата №${payment.id}${payment.resolution === 'compensation_required' ? ': требуется компенсация' : ''}`,
                at: payment.paidAt ?? payment.createdAt,
                actorId: null,
                reason: null,
            }));

        if (order.paidAt && !history.length) {
            history.push({
                event: 'Заказ отмечен оплаченным (историческая запись)',
                at: order.paidAt,
                actorId: null,
                reason: null,
            });
        }

        if (order.cancelledAt) {
            history.push({
                event: 'Заказ отменён',
                at: order.cancelledAt,
                actorId: order.cancelledBy ?? null,
                reason: order.cancelReason ?? null,
            });
        }

        for (const refund of refunds) {
            for (const transition of refund.transitions ?? []) {
                history.push({
                    event: `${REFUND_HISTORY_EVENTS[transition.status]} №${refund.id}`,
                    at: new Date(transition.at),
                    actorId: refund.initiatedBy,
                    reason: refund.reason,
                });
            }
        }

        const affectedPatterns = new Set(
            grants
                .filter((grant) => grant.orderId === id && grant.patternSizeId !== null)
                .map((grant) => grant.patternId),
        );

        const colorAccessWarnings = [...affectedPatterns]
            .filter(
                (patternId) =>
                    grants
                    .some((grant) => grant.patternId === patternId && grant.rightKey === 'color') &&
                    !grants
                    .some(
                            (grant) => grant.patternId === patternId && grant.patternSizeId !== null && grant.orderId !== id,
                        ),
            );

        return {
            ...toUserOrderDetails(order, true),
            user: order.user
                ? {
                      id: order.user.id,
                      email: order.user.email,
                  }
                : null,
            canCancel:
                order.state === ModelState.ACTIVE && !!order.user && order.status === OrderStatus.PENDING_PAYMENT,
            refundUnavailableReason: blocking
                ? `Возврат №${blocking.id} уже принят. Повторный запуск запрещён; актуальный результат указан в журнале возвратов.`
                : !order.user
                  ? 'Пользователь заказа отсутствует. Требуется ручная проверка.'
                  : refundUnavailableReason(order, payments, this.provider.name),
            colorAccessWarnings,
            payments: payments
                .map((payment) => ({
                    id: payment.id,
                    provider: payment.provider,
                    externalId: payment.externalId ?? null,
                    status: payment.status ?? null,
                    amount: payment.amount ?? null,
                    currency: payment.currency ?? null,
                    resolution: payment.resolution ?? null,
                    createdAt: payment.createdAt,
                    paidAt: payment.paidAt ?? null,
                })),
            refunds: refunds
                .map((refund) => ({
                    id: refund.id,
                    status: refund.status,
                    amount: refund.amount,
                    currency: refund.currency,
                    paymentId: refund.paymentId,
                    externalId: refund.externalId ?? null,
                    initiatedBy: refund.initiatedBy,
                    reason: refund.reason,
                    createdAt: refund.createdAt,
                    completedAt: refund.completedAt ?? null,
                    errorCode: refund.errorCode ?? null,
                })),
            history: history
                .sort((a, b) => a.at.getTime() - b.at.getTime()),
        };
    }
}
