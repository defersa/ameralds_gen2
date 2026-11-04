import type {
	OrderCurrency,
	OrderPatternSnapshot,
	OrderPriceComponentSnapshot,
} from "@am-back/db/entities/purchases/order-snapshot.model";
import type { LangNumberModel, PatternPriceValueModel } from "@ameralds/utils";
import { InvalidOrderPriceError, toMinorAmount } from "./order-price";


export interface OrderSnapshotInput {
	pattern: {
		id: number;
		name?: { ru: string; en?: string | null } | null;
		basePrice?: LangNumberModel | null;
		additionalPrice?: LangNumberModel | null;
		colorPrice?: LangNumberModel | null;
	} | null;
	sizes: { id: number; size?: { id: number; value: number } | null }[];
	color: boolean;
	requiresPatternPurchase: boolean;
}

/** Прерывает формирование денежного snapshot доменной ошибкой InvalidOrderPriceError. */
function invalidPrice(): never {
	throw new InvalidOrderPriceError("Invalid order snapshot");
}

/**
 * Создаёт компонент цены с количеством и суммами в минимальных денежных единицах; при небезопасном целом
 * результате выбрасывает InvalidOrderPriceError.
 */
function createPriceComponent(
	type: OrderPriceComponentSnapshot["type"],
	quantity: number,
	value: PatternPriceValueModel,
): OrderPriceComponentSnapshot {
	const unitAmount = toMinorAmount(value);
	const totalAmount = quantity * unitAmount;

	if (!Number.isSafeInteger(totalAmount)) {
		invalidPrice();
	}

	return {
		type,
		quantity,
		unitAmount,
		totalAmount,
	};
}

/**
 * Копирует название, размеры, цвет и компоненты цены позиции в независимый исторический snapshot RUB или
 * USD. Неверная валюта, цена или переполнение вызывает InvalidOrderPriceError.
 */
export function createOrderPatternSnapshot(item: OrderSnapshotInput, currency: OrderCurrency): OrderPatternSnapshot {
	if (!item.pattern || !["RUB", "USD"]
		.includes(currency)) {
		invalidPrice();
	}

	const lang = currency === "RUB" ? "ru" : "en";

	// Та же формула, что в getPatternPrice: AMS-7 не меняет тарифную политику.
	const components = [
		createPriceComponent("base", Number(item.requiresPatternPurchase), item.pattern.basePrice?.[lang]),
		createPriceComponent(
			"size",
			Math.max(item.sizes.length - (item.requiresPatternPurchase ? 0 : 1), 0),
			item.pattern.additionalPrice?.[lang],
		),
		createPriceComponent("color", Number(item.color), item.pattern.colorPrice?.[lang]),
	];

	const subtotalAmount = components
		.reduce((total, part) => total + part.totalAmount, 0);

	if (!Number.isSafeInteger(subtotalAmount)) {
		invalidPrice();
	}

	return {
		patternId: item.pattern.id,
		name: item.pattern.name
			? {
				ru: item.pattern.name.ru,
				en: item.pattern.name.en ?? null,
			}
			: null,
		sizes: item.sizes
			.map((size) => ({
				patternSizeId: size.id,
				sizeId: size.size?.id ?? null,
				value: size.size?.value ?? null,
			})),
		color: item.color,
		requiresPatternPurchase: item.requiresPatternPurchase,
		currency,
		subtotalAmount,
		discountAmount: 0,
		totalAmount: subtotalAmount,
		discounts: [],
		components,
	};
}

/**
 * Суммирует subtotal snapshot одной валюты в минимальных денежных единицах, задавая нулевую скидку.
 * Несовпадение валют или небезопасная сумма вызывает InvalidOrderPriceError.
 */
export function sumOrderSnapshots(
	snapshots: OrderPatternSnapshot[],
	currency: OrderCurrency,
): {
	subtotalAmount: number;
	discountAmount: number;
	totalAmount: number;
	currency: OrderCurrency;
	discounts: [];
} {
	const subtotalAmount = snapshots
		.reduce((total, item) => total + item.subtotalAmount, 0);

	if (!Number.isSafeInteger(subtotalAmount) || snapshots
		.some((item) => item.currency !== currency)) {
		invalidPrice();
	}

	return {
		subtotalAmount,
		discountAmount: 0,
		totalAmount: subtotalAmount,
		currency,
		discounts: [],
	};
}
