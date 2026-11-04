import type { ValueTransformer } from "typeorm";


export type OrderCurrency = "RUB" | "USD";

export interface OrderDiscountSnapshot {
	type: string;
	name: string;
	amount: number;
	sourceId?: string;
}

export interface OrderPriceComponentSnapshot {
	type: "base" | "size" | "color";
	quantity: number;
	unitAmount: number;
	totalAmount: number;
}

export interface OrderPatternSnapshot {
	patternId: number;
	name: { ru: string; en: string | null } | null;
	sizes: { patternSizeId: number; sizeId: number | null; value: number | null }[];
	color: boolean;
	requiresPatternPurchase: boolean;
	currency: OrderCurrency;
	subtotalAmount: number;
	discountAmount: number;
	totalAmount: number;
	discounts: OrderDiscountSnapshot[];
	components: OrderPriceComponentSnapshot[];
}

// PostgreSQL bigint возвращается строкой. CHECK в БД ограничивает значения
// диапазоном безопасных JS integers; суммы нигде не переводятся в floating point.
export const orderAmountTransformer = {
	to: (value: number | null): number | null => value,
	from: (value: string | null): number | null => (value === null ? null : Number(value)),
} satisfies ValueTransformer;
