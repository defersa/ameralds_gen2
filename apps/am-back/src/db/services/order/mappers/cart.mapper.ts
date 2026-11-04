import type { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import type { AdminOrderEntity, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import type { AdminOrderDto, AdminOrderResponseDto } from "@am-back/modules/admin/admin.dto";
import type { CartOrderDto } from "@am-back/modules/orders/dto/orders.dto";
import { getOrderPrice } from "../pricing/order-price";


/**
 * Формирует представление позиции корзины с выбранными размерами и текущими ценами схемы; удалённые связи
 * отображает как null.
 */
export function selectedItemView(item: OrderPatternEntity): CartOrderDto["patterns"][number] {
	return {
		id: item.id,
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		color: item.color,
		requiresPatternPurchase: item.requiresPatternPurchase,
		sizes: (item.sizes ?? [])
			.map((size) => ({
				id: size.id,
				createdAt: size.createdAt,
				updatedAt: size.updatedAt,
				size: size.size
					? {
						id: size.size.id,
						value: size.size.value,
						createdAt: size.size.createdAt,
					}
					: null,
			})),
		pattern: item.pattern
			? {
				id: item.pattern.id,
				createdAt: item.pattern.createdAt,
				updatedAt: item.pattern.updatedAt,
				basePrice: item.pattern.basePrice
					? {
						ru: item.pattern.basePrice.ru,
						en: item.pattern.basePrice.en,
					}
					: null,
				additionalPrice: item.pattern.additionalPrice
					? {
						ru: item.pattern.additionalPrice.ru,
						en: item.pattern.additionalPrice.en,
					}
					: null,
				colorPrice: item.pattern.colorPrice
					? {
						ru: item.pattern.colorPrice.ru,
						en: item.pattern.colorPrice.en,
					}
					: null,
			}
			: null,
	};
}

/**
 * Преобразует пользовательскую корзину в DTO с состоянием и выбранными позициями без выдачи сущности
 * пользователя.
 */
export function toUserCart(cart: UserOrderEntity): CartOrderDto {
	return {
		id: cart.id,
		createdAt: cart.createdAt,
		updatedAt: cart.updatedAt,
		status: cart.status,
		patterns: (cart.patterns ?? [])
			.map(selectedItemView),
	};
}

/** Формирует ответ административной корзины с составом заказа и стоимостью по текущему каталогу. */
export function toAdminCart(order: AdminOrderEntity): AdminOrderResponseDto {
	return {
		order: toAdminOrder(order),
		price: getOrderPrice(order.patterns ?? []),
	};
}

/** Формирует DTO административного заказа с контактами и выбранными позициями. */
export function toAdminOrder(order: AdminOrderEntity): AdminOrderDto {
	return {
		id: order.id,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
		email: order.email,
		vk: order.vk,
		isComplete: order.isComplete,
		patterns: (order.patterns ?? [])
			.map(selectedItemView),
	};
}
