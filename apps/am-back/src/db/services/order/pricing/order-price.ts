import {
	getPatternPrice,
	type PatternOrderForPriceModel,
	type PatternPriceResultModel,
	type PatternPriceValueModel,
} from "@ameralds/utils";


export class InvalidOrderPriceError extends Error {}

/**
 * Переводит цену каталога в целое число минимальных денежных единиц (копеек или центов)
 * через десятичную запись и BigInt, без умножения чисел с плавающей точкой.
 * Считает null и undefined нулевой ценой; допускает только нули после второго знака дробной части.
 * @throws {InvalidOrderPriceError} Если цена отрицательная, имеет недопустимый формат,
 * содержит ненулевые знаки после сотых или результат превышает Number.MAX_SAFE_INTEGER.
 */
export function toMinorAmount(value: PatternPriceValueModel): number {
	const text = String(value ?? 0);

	if (!/^\d+(\.\d+)?$/.test(text)) {
		invalidPrice();
	}

	const [whole, fraction = ""] = text.split(".");

	if (/[1-9]/.test(fraction
		.slice(2))) {
		invalidPrice();
	}

	const amount = BigInt(whole) * 100n + BigInt(fraction
		.slice(0, 2).padEnd(2, "0"));

	if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
		invalidPrice();
	}

	return Number(amount);
}

/** Прерывает расчёт доменной ошибкой некорректной цены для последующего преобразования в ошибку API. */
function invalidPrice(): never {
	throw new InvalidOrderPriceError("Invalid order price");
}

/**
 * Суммирует цены выбранных схем отдельно для ru и en в исходных денежных единицах каталога.
 * Расчёт каждой позиции учитывает покупку схемы, цвет и выбранные размеры через getPatternPrice.
 * Для пустого списка возвращает нулевые суммы; в минимальные денежные единицы суммы не переводит.
 */
export function getOrderPrice(patterns: PatternOrderForPriceModel[]): PatternPriceResultModel {
	return patterns
		.map(getPatternPrice)
		.reduce(
			(total, price) => ({
				ru: total.ru + price.ru,
				en: total.en + price.en,
			}),
			{
				ru: 0,
				en: 0,
			},
		);
}
