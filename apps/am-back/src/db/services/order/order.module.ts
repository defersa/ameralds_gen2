import { DbInfrastructureModule } from "@am-back/db/db-infrastructure.module";
import { AppSettingsDomainModule } from "@am-back/db/service/app-settings/app-settings.module";
import { Module } from "@nestjs/common";
import { AdminOrderMailService } from "./admin/admin-order-mail.service";
import { AdminOrderService } from "./admin/admin-order.service";
import { AdminCartService } from "./cart/admin-cart.service";
import { UserCartService } from "./cart/user-cart.service";
import { PlaceOrderService } from "./checkout/place-order.service";
import { OrderCheckoutService } from "./checkout/order-checkout.service";
import { OrderExpirationService } from "./checkout/order-expiration.service";
import { AdminOrderRepository } from "./repositories/admin-order.repository";
import { OrderPatternRepository } from "./repositories/order-pattern.repository";
import { UserOrderRepository } from "./repositories/user-order.repository";
import { UserOrderService } from "./user/user-order.service";
import { CancelUserOrderService } from "./user/cancel-user-order.service";


@Module({
	imports: [DbInfrastructureModule, AppSettingsDomainModule],
	providers: [
		UserCartService,
		AdminCartService,
		UserOrderService,
		CancelUserOrderService,
		AdminOrderService,
		AdminOrderMailService,
		OrderCheckoutService,
		PlaceOrderService,
		OrderExpirationService,
		UserOrderRepository,
		AdminOrderRepository,
		OrderPatternRepository,
	],
	exports: [
		UserCartService,
		AdminCartService,
		UserOrderService,
		CancelUserOrderService,
		AdminOrderService,
		AdminOrderMailService,
		OrderCheckoutService,
		PlaceOrderService,
	],
})
export class OrderDomainModule {}
