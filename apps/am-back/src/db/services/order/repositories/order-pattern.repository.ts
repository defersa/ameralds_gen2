import { ModelState } from "@am-back/db/abstract/abstract.model";
import { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "@am-back/db/entities/patterns/pattern-size.entity";
import { PatternEntity } from "@am-back/db/entities/patterns/pattern.entity";
import type { OrderPatternSnapshot } from "@am-back/db/entities/purchases/order-snapshot.model";
import type { InputShortOrderPatternDto } from "@am-back/modules/orders/dto/orders.dto";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, In, Repository } from "typeorm";
import type { OrderPatternOwner } from "../types/order-pattern-owner";


@Injectable()
export class OrderPatternRepository extends Repository<OrderPatternEntity> {
	/** Инициализирует TypeORM-репозиторий позиций заказа менеджером источника данных. */
	constructor(dataSource: DataSource) {
		super(OrderPatternEntity, dataSource.createEntityManager());
	}

	/**
	 * Загружает активную схему с названием, ценами и доступностью подбора цвета в переданной транзакции; при отсутствии возвращает
	 * null.
	 */
	public findSelectedPattern(id: number, manager: EntityManager): Promise<PatternEntity | null> {
		return manager.getRepository(PatternEntity).findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: {
				name: true,
				basePrice: true,
				additionalPrice: true,
				colorPrice: true,
				color: true,
			},
		});
	}

	/**
	 * Загружает размеры конкретной схемы по идентификаторам размеров каталога вместе с их значениями в
	 * переданной транзакции.
	 */
	public findSelectedSizes(
		patternId: number,
		sizeIds: number[],
		manager: EntityManager,
	): Promise<PatternSizeEntity[]> {
		return manager.getRepository(PatternSizeEntity)
			.find({
				where: {
					pattern: { id: patternId },
					size: {
						id: In(sizeIds),
					},
				},
				relations: { size: true },
			});
	}

	/**
	 * Сохраняет выбранную схему, размеры и параметры покупки как позицию пользовательского или
	 * административного заказа в транзакции.
	 */
	public insertSelection(
		input: InputShortOrderPatternDto,
		owner: OrderPatternOwner,
		pattern: PatternEntity,
		sizes: PatternSizeEntity[],
		manager: EntityManager,
	): Promise<OrderPatternEntity> {
		const repository = this.using(manager);

		return repository.save(
			repository.create({
				pattern,
				sizes,
				color: input.color,
				requiresPatternPurchase: input.requiresPatternPurchase,
				...(owner.orderId
					? {
						order: {
							id: owner.orderId,
						},
					}
					: {
						adminOrder: {
							id: owner.adminOrderId,
						},
					}),
			}),
		);
	}

	/** Удаляет позиции по идентификаторам в переданной транзакции; пустой список не выполняет запрос. */
	public async deleteItems(ids: number[], manager: EntityManager): Promise<void> {
		if (ids.length) {
			await this.using(manager).delete({
				id: In(ids),
			});
		}
	}

	/**
	 * Копирует позиции административного заказа в личный заказ, сохраняя выбор и соответствующие по индексу
	 * исторические snapshot.
	 */
	public copyAdminItems(
		orderId: number,
		items: OrderPatternEntity[],
		snapshots: (OrderPatternSnapshot | null)[],
		manager: EntityManager,
	): Promise<OrderPatternEntity[]> {
		const repository = this.using(manager);

		return repository.save(
			items
				.map((item, index) =>
					repository.create({
						order: { id: orderId },
						state: item.state,
						pattern: item.pattern,
						sizes: [...(item.sizes ?? [])],
						color: item.color,
						requiresPatternPurchase: item.requiresPatternPurchase,
						snapshot: snapshots[index],
					}),
				),
		);
	}

	/** Сохраняет snapshot каждой позиции по соответствующему индексу массива в переданной транзакции. */
	public async fixSnapshots(
		items: OrderPatternEntity[],
		snapshots: OrderPatternSnapshot[],
		manager: EntityManager,
	): Promise<void> {
		const repository = this.using(manager);

		for (const [index, item] of items
			.entries()) {
			await repository.update(item.id, {
				snapshot: snapshots[index],
			});
		}
	}

	/** Возвращает репозиторий позиций из обязательного транзакционного manager. */
	private using(manager: EntityManager): Repository<OrderPatternEntity> {
		return manager.getRepository(OrderPatternEntity);
	}
}
