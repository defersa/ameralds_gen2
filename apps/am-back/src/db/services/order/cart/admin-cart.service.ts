import type { AdminOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import type { AdminOrderResponseDto } from "@am-back/modules/admin/admin.dto";
import type { InputShortOrderPatternDto } from "@am-back/modules/orders/dto/orders.dto";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { invalidOrder } from "../errors/order-validation";
import { toAdminCart } from "../mappers/cart.mapper";
import { AdminOrderRepository } from "../repositories/admin-order.repository";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { prepareCartPattern, selectOrderPattern } from "./cart-selection";


@Injectable()
export class AdminCartService {
	/** Подключает репозитории административных корзин и позиций и источник транзакций. */
	constructor(
		private readonly orders: AdminOrderRepository,
		private readonly items: OrderPatternRepository,
		private readonly dataSource: DataSource,
	) {}

	/**
	 * В транзакции под общей блокировкой оставляет одну актуальную административную корзину, архивируя
	 * дубли и создавая корзину при отсутствии.
	 */
	public async getActualCart(): Promise<AdminOrderResponseDto> {
		return this.dataSource.transaction(async (manager) => {
			await this.orders.lockCart(manager);

			const carts = await this.orders.findOpenCarts(manager);

			if (carts.length > 1) {
				await this.orders.archiveCarts(carts
					.slice(1), manager);
			}

			const cart =
				(await this.orders.findCart(manager, { mode: "pessimistic_write" })) ??
				(await this.orders.createEmptyCart(manager));

			return toAdminCart(cart);
		});
	}

	/**
	 * Проверяет выбор схемы и заменяет её прежние позиции в заблокированной административной корзине в
	 * одной транзакции.
	 */
	public async addToCart(input: InputShortOrderPatternDto): Promise<AdminOrderResponseDto> {
		const prepared = prepareCartPattern(input);

		if (!prepared) {
			invalidOrder();
		}

		return this.withCart(async (cart, manager) => {
			const replaced = cart.patterns
				.filter((item) => item.pattern?.id === input.pattern);

			await this.items.deleteItems(
				replaced
					.map((item) => item.id),
				manager,
			);

			const item = await selectOrderPattern(
				this.items,
				prepared,
				{
					adminOrderId: cart.id,
				},
				manager,
			);

			cart.patterns = [...cart.patterns
				.filter((item) => !replaced
					.includes(item)), item];
			return toAdminCart(cart);
		});
	}

	/**
	 * Удаляет все позиции выбранной схемы из заблокированной административной корзины и возвращает новое
	 * представление.
	 */
	public async removeFromCart(patternId: number): Promise<AdminOrderResponseDto> {
		return this.withCart(async (cart, manager) => {
			const replaced = cart.patterns
				.filter((item) => item.pattern?.id === patternId);

			await this.items.deleteItems(
				replaced
					.map((item) => item.id),
				manager,
			);
			cart.patterns = cart.patterns
				.filter((item) => !replaced
					.includes(item));
			return toAdminCart(cart);
		});
	}

	/** Удаляет все позиции административной корзины в транзакции под блокировкой. */
	public async clearCart(): Promise<void> {
		await this.withCart(async (cart, manager) => {
			await this.items.deleteItems(
				cart.patterns
					.map((item) => item.id),
				manager,
			);
		});
	}

	/**
	 * Выполняет операцию над существующей административной корзиной в транзакции с advisory- и строковой
	 * блокировками; отсутствие корзины возвращает INVALID.
	 */
	private async withCart<T>(work: (cart: AdminOrderEntity, manager: EntityManager) => Promise<T>): Promise<T> {
		return this.dataSource.transaction(async (manager) => {
			await this.orders.lockCart(manager);

			const cart = await this.orders.findCart(manager, { mode: "pessimistic_write" });

			if (!cart) {
				invalidOrder();
			}

			return work(cart, manager);
		});
	}
}
