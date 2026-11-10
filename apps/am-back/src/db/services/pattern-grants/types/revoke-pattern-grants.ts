/** Область отзыва: одна позиция заказа либо одно историческое основание, а не всё владение схемой. */
export interface RevokePatternGrants {
    userId: number;
    source: { type: 'order'; orderId: number; orderItemId: number } | { type: 'legacy'; purchaseId: number };
    grantIds: number[];
    reason: string;
    /** Внешняя ссылка на уже подтверждённый возврат; финансовую операцию этот метод не выполняет. */
    refundReference: string;
}
