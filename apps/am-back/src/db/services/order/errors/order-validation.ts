import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { BadRequestException } from "@nestjs/common";
import { InvalidOrderPriceError } from "../pricing/order-price";


/** Прерывает операцию стандартной ошибкой HTTP 400 с кодом INVALID для корзины. */
export function invalidOrder(): never {
	throw new BadRequestException({
		code: ApiErrorCodes.INVALID,
		entity: ApiEntityNames.CART,
	});
}

/**
 * Выполняет расчёт и преобразует InvalidOrderPriceError в стандартную ошибку корзины; остальные ошибки
 * передаёт вызывающему коду.
 */
export function validateOrderPrice<T>(calculate: () => T): T {
	try {
		return calculate();
	} catch (error) {
		if (error instanceof InvalidOrderPriceError) {
			invalidOrder();
		}

		throw error;
	}
}
