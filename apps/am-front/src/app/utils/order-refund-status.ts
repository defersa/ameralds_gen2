import { EnumRefundStatus, type UserOrderRefundDto } from '@am-front/root/api-v2';


export const ORDER_REFUND_STATUS_LABELS = {
    [EnumRefundStatus.Accepted]: 'Возврат обрабатывается',
    [EnumRefundStatus.Processing]: 'Возврат обрабатывается',
    [EnumRefundStatus.Unknown]: 'Возврат обрабатывается: ожидаем подтверждение',
    [EnumRefundStatus.Succeeded]: 'Возвращён',
    [EnumRefundStatus.Failed]: 'Возврат отклонён',
} satisfies Record<EnumRefundStatus, string>;

/** Возвращает признак незавершённого возврата; оплата и права до подтверждения сохраняются. */
export function isRefundPending(refund: UserOrderRefundDto | null | undefined): boolean {
    return refund?.status === EnumRefundStatus.Accepted || refund?.status === EnumRefundStatus.Processing ||
        refund?.status === EnumRefundStatus.Unknown;
}
