import type { CheckoutOrderDto } from "@am-back/modules/orders/dto/checkout.dto";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import type { AdminOrderEntity, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import type { AdminOrderDetailsDto, AdminOrderListDto } from "@am-back/modules/admin/admin.dto";
import type { UserOrderDetailsDto } from "@am-back/modules/orders/dto/orders.dto";
import type { UserOrderSummaryDto } from "@am-back/modules/orders/dto/user-orders-list.dto";
import { invalidOrder } from "../errors/order-validation";
import type { OrderPlacement } from "../types/order-placement";
import { selectedItemView, toAdminOrder } from "./cart.mapper";


/** Возвращает основные поля личного заказа без связей и служебного состояния; неизвестные исторические суммы и даты сохраняет как null. */
export function toUserOrderSummary(order: UserOrderEntity): UserOrderSummaryDto {
	return {
		id: order.id,
		placedAt: order.placedAt ?? null,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
		status: order.status,
		subtotalAmount: order.subtotalAmount ?? null,
		discountAmount: order.discountAmount ?? 0,
		totalAmount: order.totalAmount ?? null,
		currency: order.currency ?? null,
		appSettingsVersion: order.appSettingsVersion ?? null,
		paymentExpiresAt: order.paymentExpiresAt ?? null,
		paidAt: order.paidAt ?? null,
		cancelledAt: order.cancelledAt ?? null,
		cancelReason: order.cancelReason ?? null,
	};
}

/**
 * Формирует личный заказ из активных позиций, предпочитая исторические snapshot названий, размеров и цвета.
 * Исключает данные пользователя и приватные пути; неизвестные исторические суммы оставляет null.
 */
export function toUserOrderDetails(order: UserOrderEntity): UserOrderDetailsDto {
	return {
		...toUserOrderSummary(order),
		discounts: order.discounts ?? [],
		patterns: (order.patterns ?? [])
			.filter((item) => item.state === ModelState.ACTIVE)
			.map((item) => ({
				id: item.id,
				createdAt: item.createdAt,
				updatedAt: item.updatedAt,
				snapshot: item.snapshot ?? null,
				categories: (item.pattern?.categories ?? [])
					.filter((category) => category.state === ModelState.ACTIVE)
					.map((category) => category.id),
				name: item.snapshot
					? item.snapshot.name
						? {
							ru: item.snapshot.name.ru,
							en: item.snapshot.name.en ?? "",
						}
						: null
					: item.pattern?.name
						? {
							ru: item.pattern.name.ru,
							en: item.pattern.name.en,
						}
						: null,
				images: (item.pattern?.images ?? [])
					.filter((image) => image.state === ModelState.ACTIVE)
					.map((image) => ({
						id: image.id,
						name: image.name,
						preview: image.preview,
						full: image.full,
					})),
				sizes: item.snapshot
					? item.snapshot.sizes
						.map((size) => ({
							id: size.patternSizeId,
							createdAt: item.createdAt,
							updatedAt: item.updatedAt,
							size:
								size.sizeId === null
									? null
									: {
										id: size.sizeId,
										value: size.value,
										createdAt: item.createdAt,
									},
						}))
					: (item.sizes ?? [])
						.filter((size) => size.state === ModelState.ACTIVE)
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
				color: item.snapshot?.color ?? item.color,
			})),
	};
}

/**
 * Формирует подробный DTO административного заказа с данными каталога и идентификаторами файлов выбранных
 * схем.
 */
export function toAdminOrderDetails(order: AdminOrderEntity): AdminOrderDetailsDto {
	return {
		...toAdminOrder(order),
		patterns: (order.patterns ?? [])
			.map((item) => ({
				...selectedItemView(item),
				pattern: item.pattern
					? {
						id: item.pattern.id,
						name: item.pattern.name
							? {
								ru: item.pattern.name.ru,
								en: item.pattern.name.en,
							}
							: null,
						description: item.pattern.description
							? {
								ru: item.pattern.description.ru,
								en: item.pattern.description.en,
							}
							: null,
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
						hidden: item.pattern.hidden,
						categories: (item.pattern.categories ?? [])
							.map((category) => category.id),
						images: (item.pattern.images ?? [])
							.map((image) => ({
								id: image.id,
								name: image.name,
								preview: image.preview,
								full: image.full,
							})),
						color: item.pattern.color
							? {
								id: item.pattern.color.id,
								name: item.pattern.color.name,
								path: item.pattern.color.path,
							}
							: null,
						sizes: (item.pattern.sizes ?? [])
							.map((size) => ({
								id: size.id,
								size: size.size
									? {
										id: size.size.id,
										value: size.size.value,
										createdAt: size.size.createdAt,
									}
									: null,
								cbb: size.cbb?.id ?? null,
								pdf: size.pdf?.id ?? null,
								png: size.png?.id ?? null,
							})),
					}
					: null,
			})),
	};
}

/** Формирует краткую строку списка административных заказов с контактами и названиями схем. */
export function toAdminOrderList(order: AdminOrderEntity): AdminOrderListDto {
	return {
		id: order.id,
		email: order.email,
		vk: order.vk,
		isComplete: order.isComplete,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
		patterns: (order.patterns ?? [])
			.map((item) => ({
				name: item.pattern?.name
					? {
						ru: item.pattern.name.ru,
						en: item.pattern.name.en,
					}
					: null,
			})),
	};
}

/**
 * Возвращает данные оформления заказа: состояние, окно оплаты, версию настроек и суммы в минимальных
 * денежных единицах.
 */
export function toOrderPlacement(order: UserOrderEntity): OrderPlacement {
	return {
		id: order.id,
		status: order.status,
		paymentExpiresAt: order.paymentExpiresAt,
		appSettingsVersion: order.appSettingsVersion,
		subtotalAmount: order.subtotalAmount,
		discountAmount: order.discountAmount,
		totalAmount: order.totalAmount,
		currency: order.currency,
		discounts: order.discounts,
	};
}

/**
 * Возвращает оформленный заказ из исторических snapshot без пользователя и приватных путей файлов.
 * При отсутствии даты оформления или версии настроек возвращает стандартную ошибку INVALID для корзины.
 */
export function toCheckoutOrder(order: UserOrderEntity): CheckoutOrderDto {
	const hasMissingPlacementMetadata = !order.placedAt || !order.appSettingsVersion;

	if (hasMissingPlacementMetadata) {
		invalidOrder();
	}

	return {
		...toUserOrderDetails(order),
		placedAt: order.placedAt,
		appSettingsVersion: order.appSettingsVersion,
	};
}
