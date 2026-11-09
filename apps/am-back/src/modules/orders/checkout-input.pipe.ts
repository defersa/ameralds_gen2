import { INT32_MAX } from "@ameralds/utils";
import { Injectable, type PipeTransform } from "@nestjs/common";
import { invalidOrder } from "@am-back/db/service/order/errors/order-validation";
import type { CheckoutInputDto } from "./dto/checkout.dto";


@Injectable()
export class CheckoutInputPipe implements PipeTransform<unknown, CheckoutInputDto> {
	/** Проверяет ID корзины и валюту; отклоняет чужие поля, включая клиентскую цену и userId, ошибкой INVALID. */
	public transform(value: unknown): CheckoutInputDto {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			invalidOrder();
		}

		if (!("cartId" in value) || !("currency" in value) || Object.keys(value).length !== 3 ||
			!("cartRevision" in value) || typeof value.cartRevision !== "string" || !/^[a-f0-9]{64}$/.test(value.cartRevision) ||
			typeof value.cartId !== "number" || !Number.isInteger(value.cartId) || value.cartId < 1 || value.cartId > INT32_MAX ||
			(value.currency !== "RUB" && value.currency !== "USD")) {
			invalidOrder();
		}

		return {
			cartId: value.cartId,
			cartRevision: value.cartRevision,
			currency: value.currency,
		};
	}
}
