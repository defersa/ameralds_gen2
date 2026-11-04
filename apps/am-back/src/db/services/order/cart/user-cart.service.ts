import type { NumberEntityDto } from "@am-back/common/common.dto";
import type { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
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
import { prepareCartPattern, selectOrderPattern } from "./cart-selection";


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

	/** Возвращает представление открытой корзины пользователя, обеспечивая её существование в транзакции. */
	public async getUserCart(userId: number): Promise<CartDto> {
		return this.withCart(userId, (cart) => Promise.resolve(this.response(cart)));
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

	/**
	 * Заменяет выбор схемы в корзине пользователя с учётом уже купленных размеров и цвета; операция
	 * выполняется в транзакции под блокировкой корзины.
	 */
	public async addToUserCart(userId: number, input: InputShortOrderPatternDto): Promise<CartDto> {
		return this.withCart(userId, async (cart, manager) => {
			const bought = await this.purchases.getBoughtSelections(userId, manager);
			const prepared = this.prepareInput(input, bought);

			if (!prepared) {
				invalidOrder();
			}

			const previous = cart.patterns
				.filter((item) => item.pattern?.id === input.pattern);

			await this.items.deleteItems(
				previous
					.map((item) => item.id),
				manager,
			);

			const item = await selectOrderPattern(
				this.items,
				prepared,
				{
					orderId: cart.id,
				},
				manager,
			);

			cart.patterns = [...cart.patterns
				.filter((item) => !previous
					.includes(item)), item];
			return this.response(cart);
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
			return this.response(cart);
		});
	}

	/**
	 * Заменяет совпадающие позиции корзины допустимым локальным выбором с учётом приобретённых прав; все
	 * изменения выполняет в одной транзакции.
	 */
	public async mergeLocalCartWithUserCart(userId: number, inputs: InputShortOrderPatternDto[]): Promise<CartDto> {
		return this.withCart(userId, async (cart, manager) => {
			const bought = await this.purchases.getBoughtSelections(userId, manager);

			const prepared = inputs
				.map((input) => this.prepareInput(input, bought))
				.filter((input): input is InputShortOrderPatternDto => input !== null && input.sizes.length > 0);

			const replaced = cart.patterns
				.filter((item) =>
					prepared
						.some((input) => input.pattern === item.pattern?.id),
				);

			await this.items.deleteItems(
				replaced
					.map((item) => item.id),
				manager,
			);

			const added: OrderPatternEntity[] = [];

			for (const input of prepared)
				added
					.push(
						await selectOrderPattern(
							this.items,
							input,
							{
								orderId: cart.id,
							},
							manager,
						),
					);
			cart.patterns = [...cart.patterns
				.filter((item) => !replaced
					.includes(item)), ...added];
			return this.response(cart);
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
			return this.response(cart);
		});
	}

	/**
	 * Обеспечивает существование OPEN-корзины пользователя и блокирует её строку до выполнения операции в
	 * одной транзакции.
	 */
	private async withCart<T>(
		userId: number,
		work: (cart: UserOrderEntity, manager: EntityManager) => Promise<T>,
	): Promise<T> {
		return this.dataSource.transaction(async (manager) => {
			await this.orders.ensureOpenCart(userId, manager);

			const cart = await this.orders.findOpenCart(userId, manager, true);

			if (!cart) {
				invalidOrder();
			}

			return work(cart, manager);
		});
	}

	/** Формирует DTO корзины и её стоимость по текущим ценам, считая отсутствие позиций пустым списком. */
	private response(cart: UserOrderEntity): CartDto {
		return {
			cart: toUserCart(cart),
			price: getOrderPrice(cart.patterns ?? []),
		};
	}

	/**
	 * Исключает ранее купленные размеры и повторную покупку цвета из выбора; для новой схемы использует
	 * обычную подготовку позиции.
	 */
	private prepareInput(
		input: InputShortOrderPatternDto,
		bought: OwnedPatternSelection[],
	): InputShortOrderPatternDto | null {
		const previous = bought
			.find((item) => item.patternId === input.pattern);

		if (!previous) {
			return prepareCartPattern(input);
		}

		const sizes = new Set(previous.sizeIds);

		return {
			pattern: input.pattern,
			requiresPatternPurchase: true,
			color: previous.color ? false : input.color,
			sizes: (input.sizes ?? [])
				.filter((size) => !sizes.has(size)),
		};
	}
}
