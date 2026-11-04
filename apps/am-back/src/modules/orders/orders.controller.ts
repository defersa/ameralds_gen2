import { NumberEntityDto } from "@am-back/common/common.dto";
import { Auth } from "@am-back/core/guards/auth.guard";
import { UserCartService } from "@am-back/db/service/order/cart/user-cart.service";
import { UserOrderService } from "@am-back/db/service/order/user/user-order.service";
import type { RequestModel } from "@am-back/models/request.model";
import { ErrorsDto } from "@am-back/modules/errors/errors.dto";
import { CartDto, InputShortOrderPatternDto, UserOrderDetailsDto } from "@am-back/modules/orders/dto/orders.dto";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";


@Controller("orders/cart")
@ApiTags("orders")
@Auth()
export class OrdersController {
	/** Подключает сервис корзины авторизованного пользователя. */
	constructor(private readonly orderService: UserCartService) {}

	/** Возвращает корзину пользователя из проверенного контекста запроса. */
	@Get()
	@ApiOkResponse({
		description: "User cart returned.",
		type: CartDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async cart(@Req() request: RequestModel): Promise<CartDto> {
		return this.orderService.getUserCart(request.user.id);
	}

	/** Добавляет выбранную схему в корзину текущего пользователя и возвращает её новое состояние. */
	@Patch("add")
	@ApiBody({ type: InputShortOrderPatternDto })
	@ApiOkResponse({
		description: "Item added to user cart.",
		type: CartDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async addItemToCart(
		@Body() pattern: InputShortOrderPatternDto,
		@Req() request: RequestModel,
	): Promise<CartDto> {
		return this.orderService.addToUserCart(request.user.id, pattern);
	}

	/** Переносит локальные выбранные схемы в корзину текущего пользователя с учётом прежних покупок. */
	@Patch("merge")
	@ApiBody({
		type: [InputShortOrderPatternDto],
	})
	@ApiOkResponse({
		description: "Local cart merged with user cart.",
		type: CartDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async mergeLocalCart(
		@Body() patterns: InputShortOrderPatternDto[],
		@Req() request: RequestModel,
	): Promise<CartDto> {
		return this.orderService.mergeLocalCartWithUserCart(request.user.id, patterns);
	}

	/** Очищает корзину текущего пользователя и возвращает её обновлённое представление. */
	@Delete()
	@ApiOkResponse({
		description: "User cart cleared.",
		type: CartDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async clearAll(@Req() request: RequestModel): Promise<CartDto> {
		return this.orderService.clearUserCart(request.user.id);
	}

	/** Удаляет схему по идентификатору из корзины текущего пользователя. */
	@Delete(":id")
	@ApiOkResponse({
		description: "Item removed from user cart.",
		type: CartDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async removeItemFromCart(
		@Param("id", ParseIntPipe) id: number,
		@Req() request: RequestModel,
	): Promise<CartDto> {
		return this.orderService.removeFromUserCart(request.user.id, id);
	}
}

@Controller("orders/cart/local")
@ApiTags("orders")
export class LocalCartController {
	/** Подключает расчёт стоимости локальной корзины через сервис корзин. */
	constructor(private readonly orderService: UserCartService) {}

	/** Рассчитывает стоимость локального набора схем по текущему каталогу без сохранения корзины. */
	@Post("price")
	@ApiBody({
		type: [InputShortOrderPatternDto],
	})
	@ApiOkResponse({
		description: "Local cart price returned.",
		type: NumberEntityDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async localCartPrice(@Body() patterns: InputShortOrderPatternDto[]): Promise<NumberEntityDto> {
		return this.orderService.getLocalPrice(patterns);
	}
}

@Controller("orders")
@ApiTags("orders")
@Auth()
export class UserOrdersController {
	/** Подключает сервис просмотра завершённых пользовательских заказов. */
	constructor(private readonly orderService: UserOrderService) {}

	/**
	 * Возвращает завершённый активный заказ, принадлежащий текущему пользователю; проверка владельца
	 * выполняется в сервисе.
	 */
	@Get(":id")
	@ApiOkResponse({
		description: "Completed personal order belonging to the authenticated user.",
		type: UserOrderDetailsDto,
	})
	@ApiBadRequestResponse({
		description: "Order is missing, incomplete, inactive or belongs to another user.",
		type: ErrorsDto,
	})
	public getOrder(@Req() request: RequestModel, @Param("id", ParseIntPipe) id: number): Promise<UserOrderDetailsDto> {
		return this.orderService.getCompletedUserOrder(request.user.id, id);
	}
}
