import { type AdminPlacedOrderDetailsDto, EnumOrderStatus } from '@am-front/root/api-v2';


/** Создаёт независимый снимок заказа для проверок списка, подтверждения и обновления финансового состояния. */
export function placedOrder(): AdminPlacedOrderDetailsDto {
    return {
        refund: null,
        refundIncidents: [],
        id: 7,
        createdAt: new Date('2026-11-22T12:00:00Z'),
        updatedAt: new Date('2026-11-22T12:00:00Z'),
        appSettingsVersion: 1,
        placedAt: new Date('2026-11-22T12:00:00Z'),
        subtotalAmount: 13000,
        discountAmount: 655,
        totalAmount: 12345,
        currency: 'RUB',
        discounts: [],
        paymentExpiresAt: null,
        paidAt: new Date('2026-11-22T12:00:00Z'),
        cancelledAt: null,
        cancelReason: null,
        status: EnumOrderStatus.Success,
        patterns: [],
        user: {
            id: 42,
            email: 'buyer@example.test',
        },
        payments: [],
        refunds: [],
        history: [],
        refundUnavailableReason: null,
        colorAccessWarnings: [21],
        canCancel: false,
    };
}
