import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderStatus, type UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, type UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';


/** Возвращает причину запрета автоматического полного возврата; те же условия используются при резервировании под блокировками. */
export function refundUnavailableReason(
    order: UserOrderEntity,
    payments: UserPaymentEntity[],
    provider: string,
): string | null {
    if (order.state !== ModelState.ACTIVE || order.sourceAdminOrder) {
        return 'Для исторического, административного или неактивного заказа требуется ручная проверка.';
    }

    if (order.status !== OrderStatus.PAID) {
        return 'Полный возврат доступен только для оплаченного заказа.';
    }

    if (
        !order.paidAt ||
        !order.placedAt ||
        !Number.isSafeInteger(order.totalAmount) ||
        order.totalAmount === null ||
        order.totalAmount < 1 ||
        !order.currency
    ) {
        return 'Нет достоверного снимка оплаченной суммы. Требуется ручная проверка.';
    }

    const successful = payments
        .filter((payment) => payment.status === PaymentStatus.SUCCEEDED);
    const payment = successful[0];

    if (
        successful.length !== 1 ||
        payment.resolution !== 'completed' ||
        payment.provider !== provider ||
        !payment.externalId ||
        !payment.paidAt ||
        payment.amount !== order.totalAmount ||
        payment.currency !== order.currency
    ) {
        return 'Нет однозначного подтверждённого платежа на полную сумму заказа. Требуется ручная проверка.';
    }

    return null;
}
