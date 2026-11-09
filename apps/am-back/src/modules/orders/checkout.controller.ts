import { Auth } from "@am-back/core/guards/auth.guard";
import { PlaceOrderService } from "@am-back/db/service/order/checkout/place-order.service";
import type { RequestModel } from "@am-back/models/request.model";
import { ErrorsDto } from "@am-back/modules/errors/errors.dto";
import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CheckoutInputPipe } from "./checkout-input.pipe";
import { CheckoutConflictDto, CheckoutInputDto, CheckoutOrderDto } from "./dto/checkout.dto";


@Controller("orders")
@ApiTags("orders")
@Auth()
export class CheckoutController {
	/** Подключает атомарное оформление пользовательской корзины. */
	constructor(private readonly checkout: PlaceOrderService) {}

	/** Оформляет корзину проверенного пользователя; повтор с тем же cartId возвращает прежний заказ. */
	@Post("checkout")
	@ApiBody({ type: CheckoutInputDto })
	@ApiCreatedResponse({
		type: CheckoutOrderDto,
		description: "Корзина оформлена; повтор возвращает исходный заказ без пересчёта цены и продления срока",
	})
	@ApiBadRequestResponse({ type: ErrorsDto, description: "Некорректный запрос, пустая, чужая или недопустимая корзина" })
	@ApiUnauthorizedResponse({ type: ErrorsDto, description: "Требуется авторизация" })
	@ApiConflictResponse({ type: CheckoutConflictDto, description: "CART_CONFLICT: подтвердите исправление конфликтующих позиций отдельно" })
	public place(@Req() request: RequestModel, @Body(CheckoutInputPipe) input: CheckoutInputDto): Promise<CheckoutOrderDto> {
		return this.checkout.place(request.user.id, input);
	}
}
