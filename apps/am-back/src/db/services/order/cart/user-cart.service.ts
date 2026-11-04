import type { NumberEntityDto } from "@am-back/common/common.dto";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import type { UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import type { OwnedPatternSelection } from "@am-back/db/service/general/pattern-purchase";
import { UserPatternService } from "@am-back/db/service/general/user-pattern.service";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import type { CartDto, InputShortOrderPatternDto } from "@am-back/modules/orders/dto/orders.dto";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { invalidOrder } from "../errors/order-validation";
import { toUserCart } from "../mappers/cart.mapper";
import { getOrderPrice } from "../pricing/order-price";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { prepareCartPattern } from "./cart-selection";
import { normalizeUserSelection } from "./normalize-user-selection";


@Injectable()
export class UserCartService {
	/**
	 * Подключает репозитории пользовательских корзин и позиций, чтение покупок и каталога и источник
	 * транзакций.
	 */
	constructor(
		private readonly orders: UserOrderRepository,
		private readonly items: OrderPatternRepository,
		private readonly purchases: UserPatternService,
		private readonly patterns: PatternsService,
		private readonly dataSource: DataSource,
	) {}

	/** Возвращает OPEN-корзину, сверяя состав с действующими правами и каталогом в транзакции. */
	public async getUserCart(userId: number): Promise<CartDto> {
		return this.withCart(userId, async () => undefined);
	}

	/**
	 * Рассчитывает стоимость допустимых позиций локальной корзины по активному нескрытому каталогу без
	 * сохранения позиций.
	 */
	public async getLocalPrice(inputs: InputShortOrderPatternDto[]): Promise<NumberEntityDto> {
		const prepared = inputs
			.map(prepareCartPattern)
			.filter((input): input is InputShortOrderPatternDto => input !== null);

		const catalogue = await this.patterns.patternsById(prepared
			.map((input) => input.pattern));

		return getOrderPrice(
			prepared
				.map((input) => ({
					...input,
					pattern: catalogue[input.pattern],
				})),
		);
	}

	/** Заменяет выбор схемы, исключая приобретённые права; пустой результат удаляет прежнюю позицию. */
	public async addToUserCart(userId: number, input: InputShortOrderPatternDto): Promise<CartDto> {
		return this.withCart(userId, async (cart, manager, bought, corrected) => {
			await this.replaceSelection(cart, input, bought, corrected, manager);
		});
	}

	/**
	 * Удаляет позиции указанной схемы только из открытой корзины выбранного пользователя и возвращает
	 * обновлённую корзину.
	 */
	public async removeFromUserCart(userId: number, patternId: number): Promise<CartDto> {
		return this.withCart(userId, async (cart, manager) => {
			const previous = cart.patterns
				.filter((item) => item.pattern?.id === patternId);

			await this.items.deleteItems(
				previous
					.map((item) => item.id),
				manager,
			);
			cart.patterns = cart.patterns
				.filter((item) => !previous
					.includes(item));
		});
	}

	/** Объединяет повторяющиеся локальные позиции и заменяет выбор с учётом действующих прав. */
	public async mergeLocalCartWithUserCart(userId: number, inputs: InputShortOrderPatternDto[]): Promise<CartDto> {
		return this.withCart(userId, async (cart, manager, bought, corrected) => {
			const merged = new Map<number, InputShortOrderPatternDto>();

			for (const input of inputs) {
				const previous = merged.get(input.pattern);

				merged.set(input.pattern, {
					...input,
					sizes: [...new Set([...(previous?.sizes ?? []), ...(input.sizes ?? [])])],
					color: Boolean(previous?.color || input.color),
				});
			}

			for (const input of merged.values()) {
				await this.replaceSelection(cart, input, bought, corrected, manager);
			}
		});
	}

	/** Удаляет все позиции открытой корзины пользователя и возвращает пустую корзину с пересчитанной ценой. */
	public async clearUserCart(userId: number): Promise<CartDto> {
		return this.withCart(userId, async (cart, manager) => {
			await this.items.deleteItems(
				cart.patterns
					.map((item) => item.id),
				manager,
			);
			cart.patterns = [];
		});
	}

	/**
	 * Блокирует пользователя перед корзиной, как при выдаче прав. Все операции, включая чтение,
	 * восстанавливают актуальный состав OPEN-корзины в той же транзакции.
	 */
	private async withCart(
		userId: number,
		work: (
			cart: UserOrderEntity,
			manager: EntityManager,
			bought: OwnedPatternSelection[],
			corrected: Set<number>,
		) => Promise<void>,
	): Promise<CartDto> {
		return this.dataSource.transaction(async (manager) => {
			await this.orders.lockOwner(userId, manager);
			await this.orders.ensureOpenCart(userId, manager);

			const cart = await this.orders.findOpenCart(userId, manager, true);

			if (!cart) {
				invalidOrder();
			}

			const bought = await this.purchases.getBoughtSelections(userId, manager);
			const corrected = new Set<number>();

			for (const item of [...cart.patterns]) {
				if (!item.pattern || item.state !== ModelState.ACTIVE) {
					await this.items.deleteItems([item.id], manager);
					cart.patterns = cart.patterns
						.filter((current) => current !== item);
					continue;
				}

				await this.replaceSelection(cart, {
					pattern: item.pattern.id,
					sizes: (item.sizes ?? [])
						.flatMap((size) => size.size ? [size.size.id] : []),
					color: item.color,
					requiresPatternPurchase: item.requiresPatternPurchase,
				}, bought, corrected, manager);
			}

			await work(cart, manager, bought, corrected);

			return this.response(cart, corrected);
		});
	}

	/** Формирует актуальную корзину, серверную цену и идентификаторы скорректированных схем. */
	private response(cart: UserOrderEntity, corrected = new Set<number>()): CartDto {
		return {
			cart: toUserCart(cart),
			price: getOrderPrice(cart.patterns ?? []),
			correctedPatternIds: [...corrected],
		};
	}

	/**
	 * Проверяет каталог и права, сохраняет только новый выбор или удаляет пустую позицию.
	 * Флаг покупки схемы вычисляется сервером; клиентские цены и признаки владения не используются.
	 */
	private async replaceSelection(
		cart: UserOrderEntity,
		input: InputShortOrderPatternDto,
		bought: OwnedPatternSelection[],
		corrected: Set<number>,
		manager: EntityManager,
	): Promise<void> {
		const pattern = await this.items.findSelectedPattern(input.pattern, manager);
		const available = pattern && !pattern.hidden
			? await this.items.findSelectedSizes(input.pattern, input.sizes ?? [], manager)
			: [];

		const validIds = available
			.filter((size) => size.state === ModelState.ACTIVE && size.size?.state === ModelState.ACTIVE)
			.map((size) => size.size.id);

		const prepared = normalizeUserSelection({
			...input,
			sizes: validIds,
			color: Boolean(pattern && !pattern.hidden && input.color),
		}, bought);

		if (!prepared || prepared.color !== input.color || prepared.sizes.length !== input.sizes?.length ||
			prepared.sizes
				.some((id) => !input.sizes
					.includes(id))) {
			corrected.add(input.pattern);
		}

		const previous = cart.patterns
			.filter((item) => item.pattern?.id === input.pattern);

		if (prepared && previous.length === 1 &&
			previous[0].color === prepared.color && previous[0].requiresPatternPurchase === prepared.requiresPatternPurchase &&
			previous[0].sizes.length === prepared.sizes.length && previous[0].sizes
				.every((size) => prepared.sizes
					.includes(size.size?.id))) {
			return;
		}

		await this.items.deleteItems(previous
			.map((item) => item.id), manager);
		cart.patterns = cart.patterns
			.filter((item) => !previous
				.includes(item));

		if (prepared && pattern) {
			const sizes = available
				.filter((size) => prepared.sizes
					.includes(size.size?.id));

			cart.patterns
				.push(await this.items.insertSelection(prepared, { orderId: cart.id }, pattern, sizes, manager));
		}
	}
}
