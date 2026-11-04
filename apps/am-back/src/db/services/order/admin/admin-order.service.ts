import { ApiEntityNames, ApiErrorCodes, DEFAULT_PAGE_SIZE, FIRST_PAGE, MAX_PAGE_NUMBER } from "@ameralds/utils";
import type {
	AdminOrderDetailsDto,
	AdminOrderResponseDto,
	AdminOrdersPaginatedPageDto,
	CompleteAdminOrderDto,
} from "@am-back/modules/admin/admin.dto";
import type { FileDto } from "@am-back/modules/files/files.dto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { toAdminCart } from "../mappers/cart.mapper";
import { toAdminOrderDetails, toAdminOrderList } from "../mappers/order.mapper";
import { AdminOrderRepository } from "../repositories/admin-order.repository";
import type { AdminOrdersPaginatedFilters } from "../types/admin-orders-filters";
import { UserOrderService } from "../user/user-order.service";
import { AdminOrderMailService } from "./admin-order-mail.service";
import { getAdminOrderFiles } from "./order-files";


@Injectable()
export class AdminOrderService {
	/**
	 * Подключает репозиторий административных заказов, создание личных покупок, почту и источник
	 * транзакций.
	 */
	constructor(
		private readonly orders: AdminOrderRepository,
		private readonly purchases: UserOrderService,
		private readonly mail: AdminOrderMailService,
		private readonly dataSource: DataSource,
	) {}

	/** Возвращает подробное DTO активного административного заказа; при отсутствии возвращает NOT_EXIST. */
	public async getAdminOrderById(id: number): Promise<AdminOrderDetailsDto> {
		const order = await this.orders.findDetail(id);

		if (!order) {
			throw new BadRequestException({
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.CART,
			});
		}

		return toAdminOrderDetails(order);
	}

	/**
	 * Проверяет активность и завершённость заказа и принадлежность активного CBB/PDF файлу его состава;
	 * отсутствующий файл возвращает NOT_EXIST.
	 */
	public async getAdminOrderFile(id: number, fileId: number): Promise<FileDto> {
		const order = await this.orders.findDownload(id);

		const file = getAdminOrderFiles(order)
			.find((file) => file.id === fileId);

		if (!file) {
			throw new BadRequestException({
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.FILE,
			});
		}

		return {
			id: file.id,
			name: file.name,
			path: file.path,
		};
	}

	/**
	 * Проверяет страницу и даты и читает список завершённых заказов с общим количеством в едином снимке
	 * REPEATABLE READ.
	 */
	public async paginatedAdminOrder(
		page: number,
		filters: AdminOrdersPaginatedFilters = {},
	): Promise<AdminOrdersPaginatedPageDto> {
		if (
			!Number.isSafeInteger(page) ||
			page < FIRST_PAGE ||
			page > MAX_PAGE_NUMBER ||
			[filters.startDate, filters.endDate]
				.some(
					(value) => value !== undefined && !Number.isFinite(value.valueOf()),
				)
		) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			});
		}

		const take = DEFAULT_PAGE_SIZE;

		return this.dataSource.transaction("REPEATABLE READ", async (manager) => {
			const [ids, total] = await Promise.all([
				this.orders.findPageIds(filters, take, (page - FIRST_PAGE) * take, manager),
				this.orders.countCompleted(filters, manager),
			]);

			return {
				page,
				count: Math.ceil(total / take),
				items: (await this.orders.findPageRows(ids, manager))
					.map(toAdminOrderList),
			};
		});
	}

	/**
	 * Под общей блокировкой завершает административную корзину, создаёт личную покупку при наличии email и
	 * открывает новую корзину. Письмо отправляет после фиксации транзакции.
	 */
	public async completeOrder(details: CompleteAdminOrderDto = {}): Promise<AdminOrderResponseDto> {
		const { completedOrder, newOrder } = await this.dataSource.transaction(async (manager) => {
			await this.orders.lockCart(manager);

			const order = await this.orders.findCart(manager, { mode: "pessimistic_write" });

			if (!order) {
				throw new BadRequestException({
					code: ApiErrorCodes.NOT_EXIST,
					entity: ApiEntityNames.CART,
				});
			}

			if (details.email !== undefined) {
				order.email = details.email;
			}

			if (typeof order.email === "string") {
				order.email = order.email.trim().toLowerCase();
			}

			if (details.vk !== undefined) {
				order.vk = details.vk;
			}

			order.isComplete = true;

			const completedOrder = await this.orders.saveCart(order, manager);

			await this.purchases.createFromAdminOrder(completedOrder.id, manager);
			return {
				completedOrder,
				newOrder: await this.orders.createEmptyCart(manager),
			};
		});

		await this.mail.sendCompletedOrder({
			id: completedOrder.id,
			email: completedOrder.email,
		});
		return toAdminCart(newOrder);
	}
}
