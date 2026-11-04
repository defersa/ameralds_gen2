import type { OrderCurrency, OrderDiscountSnapshot } from "@am-back/db/entities/purchases/order-snapshot.model";
import type { OrderStatus } from "@am-back/db/entities/purchases/order.entity";


export interface OrderPlacement {
	id: number;
	status: OrderStatus;
	paymentExpiresAt: Date | null;
	appSettingsVersion: number | null;
	subtotalAmount: number | null;
	discountAmount: number;
	totalAmount: number | null;
	currency: OrderCurrency | null;
	discounts: OrderDiscountSnapshot[];
}
