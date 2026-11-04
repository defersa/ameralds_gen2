import { ApiEntityNames, ApiErrorCodes, MILLISECONDS_PER_DAY } from "@ameralds/utils";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import type { OrderCurrency } from "@am-back/db/entities/purchases/order-snapshot.model";
import { OrderStatus } from "@am-back/db/entities/purchases/order.entity";
import { AppSettingsService } from "@am-back/db/service/app-settings/app-settings.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { invalidOrder, validateOrderPrice } from "../errors/order-validation";
import { toOrderPlacement } from "../mappers/order.mapper";
import { createOrderPatternSnapshot, sumOrderSnapshots } from "../pricing/order-snapshot";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";
import type { OrderPlacement } from "../types/order-placement";


@Injectable()
export class OrderCheckoutService {
	/** Подключает репозитории заказа и позиций и чтение версий настроек для оформления оплаты. */
	constructor(
		private readonly orders: UserOrderRepository,
		private readonly items: OrderPatternRepository,
		private readonly settings: AppSettingsService,
	) {}

	/**
	 * В активной транзакции блокирует собственную непустую OPEN-корзину и фиксирует snapshot позиций и
	 * итогов в минимальных денежных единицах. Недопустимое состояние или цена возвращает INVALID.
	 */
	public async capture(
		orderId: number,
		userId: number,
		currency: OrderCurrency,
		manager: EntityManager,
	): Promise<OrderPlacement> {
		if (!manager.queryRunner?.isTransactionActive) {
			throw new Error("Order snapshot requires an active transaction");
		}

		const order = await this.orders.lockForSnapshot(orderId, userId, manager);

		if (!order || order.status !== OrderStatus.OPEN || order.sourceAdminOrder || !order.patterns.length) {
			invalidOrder();
		}

		if (
			order.patterns
				.some(
					(item) => !item.pattern || item.state !== ModelState.ACTIVE || item.pattern.state !== ModelState.ACTIVE,
				)
		) {
			invalidOrder();
		}

		const snapshots = validateOrderPrice(() =>
			order.patterns
				.map((item) => createOrderPatternSnapshot(item, currency)),
		);

		const amounts = validateOrderPrice(() => sumOrderSnapshots(snapshots, currency));

		await this.items.fixSnapshots(order.patterns, snapshots, manager);
		await this.orders.fixAmounts(order.id, amounts, manager);
		return toOrderPlacement({
			...order,
			...amounts,
		});
	}

	/**
	 * В активной транзакции блокирует собственный заказ и переводит OPEN с зафиксированной ценой в
	 * PENDING_PAYMENT по времени БД и текущим настройкам. Повторный вызов возвращает прежнее окно оплаты.
	 */
	public async startPaymentWindow(orderId: number, userId: number, manager: EntityManager): Promise<OrderPlacement> {
		if (!manager.queryRunner?.isTransactionActive) {
			throw new Error("Checkout requires an active transaction");
		}

		const order = await this.orders.lockForPayment(orderId, userId, manager);

		if (!order || order.sourceAdminOrder != null) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			});
		}

		if (order.status === OrderStatus.PENDING_PAYMENT) {
			if (!order.paymentExpiresAt || !order.appSettingsVersion) {
				throw new Error("Pending order has no payment window");
			}

			return toOrderPlacement(order);
		}

		if (
			order.status !== OrderStatus.OPEN ||
			order.subtotalAmount == null ||
			order.totalAmount == null ||
			!order.currency
		) {
			invalidOrder();
		}

		const settings = await this.settings.current(manager);
		const now = await this.orders.databaseTime(manager);

		order.status = OrderStatus.PENDING_PAYMENT;
		order.paymentExpiresAt = new Date(
			now.valueOf() + settings.effective.orders.paymentExpirationDays * MILLISECONDS_PER_DAY,
		);
		order.appSettingsVersion = settings.version;
		await this.orders.fixPaymentWindow(order.id, order.paymentExpiresAt, order.appSettingsVersion, manager);
		return toOrderPlacement(order);
	}
}
