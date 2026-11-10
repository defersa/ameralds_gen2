import type { UserOrderFilters } from '../types/user-order-filters';
import type { UserOrdersPageDto } from '@am-back/modules/orders/dto/user-orders-list.dto';
import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import { OrderStatus } from "@am-back/db/entities/purchases/order.entity";
import { UserPatternService } from "@am-back/db/service/general/user-pattern.service";
import { UserService } from "@am-back/db/service/user.service";
import type { UserOrderDetailsDto } from "@am-back/modules/orders/dto/orders.dto";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { EntityManager } from "typeorm";
import { invalidOrder, validateOrderPrice } from "../errors/order-validation";
import { toUserOrderDetails, toUserOrderSummary } from "../mappers/order.mapper";
import { createOrderPatternSnapshot, sumOrderSnapshots } from "../pricing/order-snapshot";
import { AdminOrderRepository } from "../repositories/admin-order.repository";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";


@Injectable()
export class UserOrderService {
	/**
	 * Подключает чтение административного источника, создание личного заказа и позиций и выдачу прав
	 * покупателю.
	 */
	constructor(
		private readonly sources: AdminOrderRepository,
		private readonly orders: UserOrderRepository,
		private readonly items: OrderPatternRepository,
		private readonly users: UserService,
		private readonly purchases: UserPatternService,
	) {}

    /** Возвращает основные поля оформленных заказов владельца и пагинацию без позиций, связей и персональных данных. */
    public async getUserOrders(userId: number, filters: UserOrderFilters): Promise<UserOrdersPageDto> {
        const result = await this.orders.findPlacedOrders(userId, filters);

        return {
            page: result.page,
            count: result.count,
            items: result.items
                .map(toUserOrderSummary),
        };
    }

	/**
	 * Возвращает DTO активного оформленного заказа владельца, включая ожидающий оплаты.
	 * Чужой, отсутствующий, неактивный заказ или OPEN-корзина возвращает NOT_EXIST.
	 */
	public async getUserOrder(userId: number, id: number): Promise<UserOrderDetailsDto> {
		const order = await this.orders.findPlacedOrder(userId, id);

		if (!order) {
			throw new BadRequestException({
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.CART,
			});
		}

		// Возвращаем только представление заказа, без пользователя, админского заказа и путей приватных файлов.
		return toUserOrderDetails(order);
	}

	/**
	 * В активной транзакции идемпотентно копирует завершённый административный заказ в оплаченную личную
	 * покупку и выдаёт права. Возвращает id покупки либо null без email; при удалённых схемах оставляет
	 * неизвестные суммы null.
	 */
	public async createFromAdminOrder(adminOrderId: number, manager: EntityManager): Promise<number | null> {
		if (!manager.queryRunner?.isTransactionActive) {
			invalidOrder();
		}

		const source = await this.sources.findPurchaseSource(adminOrderId, manager);

		if (!source) {
			invalidOrder();
		}

		if (!source.email) {
			return null;
		}

		const userId = await this.users.getOrCreateBuyerId(source.email, manager);
		const existing = await this.orders.findByAdminSource(source.id, manager);

		if (existing) {
			return existing.id;
		}

		const snapshots = validateOrderPrice(() =>
			(source.patterns ?? [])
				.map((item) => (item.pattern ? createOrderPatternSnapshot(item, "RUB") : null)),
		);

		const amounts = validateOrderPrice(() =>
			snapshots
				.every((item) => item !== null)
				? sumOrderSnapshots(snapshots, "RUB")
				: {
					subtotalAmount: null,
					discountAmount: 0,
					totalAmount: null,
					currency: null,
					discounts: [],
				},
		);

		const order = await this.orders.createAdminPurchase(userId, source.id, manager);

		Object.assign(order, amounts);
		order.patterns = await this.items.copyAdminItems(order.id, source.patterns ?? [], snapshots, manager);
		order.status = OrderStatus.PAID;
		order.state = ModelState.ACTIVE;
		order.paidAt = await this.orders.databaseTime(manager);
		await this.orders.finishAdminPurchase(order, manager);
		await this.purchases.addBoughtSelections(
			userId,
			order.patterns
				.map((item) => ({
					patternId: item.pattern?.id ?? null,
					active: item.state === ModelState.ACTIVE && item.pattern?.state === ModelState.ACTIVE,
					color: item.color,
					sizes: (item.sizes ?? [])
						.map((size) => ({
							id: size.id,
							active: size.state === ModelState.ACTIVE,
						})),
				})),
			manager,
		);
		return order.id;
	}
}
