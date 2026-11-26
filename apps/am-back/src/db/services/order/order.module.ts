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
import { PaymentService } from '../payment/payment.service';
import { PaymentRepository } from '../payment/repositories/payment.repository';
import { MockPaymentProvider } from '../payment/providers/mock-payment.provider';
import { PAYMENT_PROVIDER } from '../payment/types/payment-provider';
import { PaymentCompletionService } from '../payment/payment-completion.service';
import { PaymentVerificationService } from '../payment/payment-verification.service';
import { PaymentEffectsService } from '../payment/payment-effects.service';
import { PaymentCompletionRepository } from '../payment/repositories/payment-completion.repository';
import { PaymentEffectRepository } from '../payment/repositories/payment-effect.repository';
import { RefundDiscoveryService } from '../refunds/refund-discovery.service';
import { RefundDiscoveryRepository } from '../refunds/repositories/refund-discovery.repository';
import { RefundResultService } from '../refunds/refund-result.service';
import { RefundReservationService } from '../refunds/refund-reservation.service';
import { RefundProcessingService } from '../refunds/refund-processing.service';
import { RefundRepository } from '../refunds/repositories/refund.repository';
import { AdminPlacedOrderRepository } from './repositories/admin-placed-order.repository';
import { AdminPlacedOrdersService } from './admin/admin-placed-orders.service';
import { AdminPlacedOrderActionsService } from './admin/admin-placed-order-actions.service';


@Module({
	imports: [DbInfrastructureModule, AppSettingsDomainModule],
	providers: [
        AdminPlacedOrderRepository,
        AdminPlacedOrdersService,
        AdminPlacedOrderActionsService,
		PaymentService,
		PaymentCompletionService,
		PaymentVerificationService,
		PaymentEffectsService,
		PaymentCompletionRepository,
		PaymentEffectRepository,
		PaymentRepository,
		RefundResultService,
		RefundReservationService,
		RefundProcessingService,
		RefundRepository,
        RefundDiscoveryService,
        RefundDiscoveryRepository,
		{ provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
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
        AdminPlacedOrdersService,
        AdminPlacedOrderActionsService,
		PaymentService,
		PaymentVerificationService,
		RefundProcessingService,
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
