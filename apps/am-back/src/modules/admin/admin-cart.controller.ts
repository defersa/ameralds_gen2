import { ParamsPaginatedDto } from "@am-back/common/common.dto";
import { Auth } from "@am-back/core/guards/auth.guard";
import { Roles } from "@am-back/core/guards/role.guard";
import { UserRole } from "@am-back/db/entities/user.entity";
import { FilesService } from "@am-back/db/service/files.service";
import { AdminOrderMailService } from "@am-back/db/service/order/admin/admin-order-mail.service";
import { AdminOrderService } from "@am-back/db/service/order/admin/admin-order.service";
import { AdminCartService } from "@am-back/db/service/order/cart/admin-cart.service";
import {
	AdminOrderDetailsDto,
	AdminOrderResponseDto,
	AdminOrdersPaginatedFilterDto,
	AdminOrdersPaginatedPageDto,
	CompleteAdminOrderDto,
} from "@am-back/modules/admin/admin.dto";
import { ErrorsDto } from "@am-back/modules/errors/errors.dto";
import { InputShortOrderPatternDto } from "@am-back/modules/orders/dto/orders.dto";
import { toString } from "@ameralds/utils";
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	StreamableFile,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiBody,
	ApiForbiddenResponse,
	ApiNoContentResponse,
	ApiOkResponse,
	ApiProduces,
	ApiTags,
} from "@nestjs/swagger";
import { extname } from "path";


@Controller("admin/cart")
@ApiTags("admin")
@Auth()
@Roles(UserRole.ADMIN)
export class AdminCartController {
	/** Подключает управление административной корзиной, заказами, письмами и потоками файлов. */
	constructor(
		private readonly carts: AdminCartService,
		private readonly orders: AdminOrderService,
		private readonly mail: AdminOrderMailService,
		private readonly filesService: FilesService,
	) {}

	/** Возвращает текущую административную корзину, создавая её при необходимости через сервис корзин. */
	@Get()
	@ApiOkResponse({
		description: "Admin cart returned.",
		type: AdminOrderResponseDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async lastOrder(): Promise<AdminOrderResponseDto> {
		return this.carts.getActualCart();
	}

	/** Преобразует HTTP-фильтры и даты и возвращает страницу завершённых административных заказов. */
	@Get("list/:page")
	@ApiOkResponse({
		description: "Paginated admin orders returned.",
		type: AdminOrdersPaginatedPageDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async page(
		@Param() params: ParamsPaginatedDto,
		@Query() filters: AdminOrdersPaginatedFilterDto,
	): Promise<AdminOrdersPaginatedPageDto> {
		const startDate = toString(filters.startDate);
		const endDate = toString(filters.endDate);

		return this.orders.paginatedAdminOrder(Number(params.page), {
			email: toString(filters.email),
			vk: toString(filters.vk),
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
		});
	}

	/** Возвращает подробности активного административного заказа по целочисленному идентификатору. */
	@Get(":id")
	@ApiOkResponse({
		description: "Admin order with full pattern details returned.",
		type: AdminOrderDetailsDto,
	})
	@ApiBadRequestResponse({
		description: "Admin order does not exist or its ID is invalid.",
		type: ErrorsDto,
	})
	public async getAdminOrderById(@Param("id", ParseIntPipe) id: number): Promise<AdminOrderDetailsDto> {
		return this.orders.getAdminOrderById(id);
	}

	/**
	 * Возвращает поток CBB или PDF завершённого административного заказа после проверки принадлежности
	 * файла; задаёт безопасное имя скачивания.
	 */
	@Get(":id/download/:fileId")
	@Auth()
	@ApiProduces("application/pdf", "application/octet-stream")
	@ApiOkResponse({
		description: "CBB or PDF file from a completed admin order.",
		schema: {
			type: "string",
			format: "binary",
		},
	})
	@ApiBadRequestResponse({
		description: "Order is missing or incomplete, file is unavailable or is not a CBB/PDF file in the order.",
		type: ErrorsDto,
	})
	@ApiForbiddenResponse({ description: "An authenticated administrator is required." })
	public async downloadOrderFile(
		@Param("id", ParseIntPipe) id: number,
		@Param("fileId", ParseIntPipe) fileId: number,
	): Promise<StreamableFile> {
		const file = await this.orders.getAdminOrderFile(id, fileId);
		const stream = await this.filesService.getFileAsStream(file);

		const filename = encodeURIComponent(file.name).replace(
			/['()*]/g,
			(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
		);

		return new StreamableFile(stream, {
			type: extname(file.name).toLowerCase() === ".pdf" ? "application/pdf" : "application/octet-stream",
			disposition: `attachment; filename*=UTF-8''${filename}`,
		});
	}

	/** Добавляет или заменяет выбранную схему в административной корзине и возвращает обновлённую корзину. */
	@Patch("add")
	@ApiBody({ type: InputShortOrderPatternDto })
	@ApiOkResponse({
		description: "Item added to admin cart.",
		type: AdminOrderResponseDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async addItemToOrder(@Body() pattern: InputShortOrderPatternDto): Promise<AdminOrderResponseDto> {
		return this.carts.addToCart(pattern);
	}

	/** Завершает административный заказ с контактами покупателя и возвращает новую открытую корзину. */
	@Patch("complete")
	@ApiBody({
		type: CompleteAdminOrderDto,
		required: false,
	})
	@ApiOkResponse({
		description:
			"Admin order completed, copied to the email owner with purchased patterns, and a new cart opened. A passwordless account is created if needed.",
		type: AdminOrderResponseDto,
	})
	@ApiBadRequestResponse({
		description: "Admin cart does not exist or the email is invalid.",
		type: ErrorsDto,
	})
	public async completeOrder(@Body() details: CompleteAdminOrderDto): Promise<AdminOrderResponseDto> {
		return this.orders.completeOrder(details);
	}

	/** Повторно отправляет письмо по завершённому административному заказу; при успехе возвращает HTTP 204. */
	@Post(":id/resend-email")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: "Completed admin order email resent using the configured mail service." })
	@ApiBadRequestResponse({
		description: "Admin order does not exist, is incomplete, has no email or its ID is invalid.",
		type: ErrorsDto,
	})
	public async resendOrderEmail(@Param("id", ParseIntPipe) id: number): Promise<void> {
		await this.mail.resendOrderEmail(id);
	}

	/** Очищает состав текущей административной корзины. */
	@Delete()
	@ApiOkResponse({ description: "Admin cart cleared." })
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async clearAll(): Promise<void> {
		return this.carts.clearCart();
	}

	/**
	 * Удаляет схему по её идентификатору из административной корзины и возвращает обновлённое
	 * представление.
	 */
	@Delete(":id")
	@ApiOkResponse({
		description: "Item removed from admin cart.",
		type: AdminOrderResponseDto,
	})
	@ApiBadRequestResponse({
		description: "Something went wrong.",
		type: ErrorsDto,
	})
	public async removeItemFromCart(@Param("id", ParseIntPipe) id: number): Promise<AdminOrderResponseDto> {
		return this.carts.removeFromCart(id);
	}
}
