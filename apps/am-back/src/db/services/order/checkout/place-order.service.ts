import { CheckoutConflictReason } from "@ameralds/utils";
import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { OrderStatus } from "@am-back/db/entities/purchases/order.entity";
import { UserPatternService } from "@am-back/db/service/general/user-pattern.service";
import type { CheckoutInputDto, CheckoutOrderDto } from "@am-back/modules/orders/dto/checkout.dto";
import { ConflictException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { cartRevision } from "../cart/cart-revision";
import { invalidOrder } from "../errors/order-validation";
import { toCheckoutOrder } from "../mappers/order.mapper";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { checkoutConflicts } from "./checkout-conflicts";
import { OrderCheckoutService } from "./order-checkout.service";


@Injectable()
export class PlaceOrderService {
	/** Подключает транзакции, репозиторий заказов, действующие права и фиксацию цены и срока оплаты. */
	constructor(
		private readonly dataSource: DataSource,
		private readonly orders: UserOrderRepository,
		private readonly purchases: UserPatternService,
		private readonly checkout: OrderCheckoutService,
	) {}

	/**
	 * Атомарно оформляет собственную OPEN-корзину, не исправляя конфликты молча.
	 * ID исходной корзины обеспечивает повтор после потери ответа: возвращается тот же snapshot.
	 * Новая OPEN-корзина создаётся в той же транзакции; существующая корзина при повторе сохраняется.
	 * Чужой/пустой заказ отклоняется INVALID, изменившийся состав — CART_CONFLICT с позициями.
	 */
	public async place(userId: number, input: CheckoutInputDto): Promise<CheckoutOrderDto> {
		return this.dataSource.transaction(async (manager) => {
			await this.orders.lockOwner(userId, manager);

			const order = await this.orders.lockForSnapshot(input.cartId, userId, manager);

			if (!order || order.sourceAdminOrder) {
				invalidOrder();
			}

			if (order.status !== OrderStatus.OPEN) {
				if (!order.placedAt || order.currency !== input.currency) {
					invalidOrder();
				}

				await this.orders.ensureOpenCart(userId, manager);

				return toCheckoutOrder(order);
			}

			if (!order.patterns.length) {
				invalidOrder();
			}

			await this.checkout.capture(order.id, userId, input.currency, manager, async (current) => {
				const bought = await this.purchases.getBoughtSelections(userId, manager);
				const conflicts = checkoutConflicts(current.patterns, bought);

				if (cartRevision(current) !== input.cartRevision) {
					for (const item of current.patterns) {
						if (!conflicts
							.some((conflict) => conflict.itemId === item.id)) {
							conflicts
								.push({
								itemId: item.id,
								patternId: item.pattern?.id ?? null,
								name: item.pattern?.name?.ru ?? null,
								sizeIds: (item.sizes ?? [])
									.flatMap((size) => size.size ? [size.size.id] : []),
								color: item.color,
								reasons: [CheckoutConflictReason.SELECTION_CHANGED],
							});
						}
					}
				}

				if (conflicts.length) {
					throw new ConflictException({
						code: ApiErrorCodes.CART_CONFLICT,
						entity: ApiEntityNames.CART,
						items: conflicts,
					});
				}
			});

			await this.checkout.startPaymentWindow(order.id, userId, manager);
			await this.orders.ensureOpenCart(userId, manager);

			const placed = await this.orders.lockForSnapshot(order.id, userId, manager);

			if (!placed) {
				invalidOrder();
			}

			return toCheckoutOrder(placed);
		});
	}
}
