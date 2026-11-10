import { EnumOrderStatus } from '@am-front/root/api-v2';


export const ORDER_STATUS_LABELS = {
    [EnumOrderStatus.Open]: 'Корзина',
    [EnumOrderStatus.PendingPayment]: 'Ожидает оплаты',
    [EnumOrderStatus.Success]: 'Оплачен',
    [EnumOrderStatus.Cancel]: 'Отменён',
    [EnumOrderStatus.PartiallyRefunded]: 'Частичный возврат',
    [EnumOrderStatus.Refunded]: 'Возврат',
} satisfies Record<EnumOrderStatus, string>;
