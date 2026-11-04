import { Injectable } from "@nestjs/common";
import { type EntityManager, Repository } from "typeorm";
import { ModelState } from "../../abstract/abstract.model";
import { DataSourceService } from "../../data-source.service";
import { OrderPatternEntity, UserPatternEntity } from "../../entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "../../entities/patterns/pattern-size.entity";
import { PatternEntity } from "../../entities/patterns/pattern.entity";
import { UserEntity } from "../../entities/user.entity";
import type { GrantedPatternSelection, OwnedPatternSelection } from "./pattern-purchase";


@Injectable()
export class UserPatternService {
	private userPatternRepository: Repository<UserPatternEntity>;

	/** Подключает репозиторий приобретённых пользователями схем. */
	constructor(private dataSource: DataSourceService) {
		this.userPatternRepository = this.dataSource.getRepository<UserPatternEntity>(UserPatternEntity);
	}

	/**
	 * Возвращает идентификаторы приобретённых схем, цвет и размеры пользователя для расчёта новых покупок в
	 * переданной транзакции.
	 */
	public async getBoughtSelections(userId: number, manager: EntityManager): Promise<OwnedPatternSelection[]> {
		const bought = await this.getBoughtPatternsByUser({ id: userId }, manager);

		return bought
			.filter((item) => item.pattern)
			.map((item) => ({
				patternId: item.pattern.id,
				color: item.color,
				sizeIds: item.sizes
					.filter((size) => size.state === ModelState.ACTIVE && size.size?.state === ModelState.ACTIVE)
					.flatMap((size) => (size.size ? [size.size.id] : [])),
			}));
	}

	/** Преобразует выдаваемые права в позиции покупки и добавляет их пользователю в переданной транзакции. */
	public async addBoughtSelections(
		userId: number,
		selections: GrantedPatternSelection[],
		manager: EntityManager,
	): Promise<void> {
		const user = Object.assign(new UserEntity(), { id: userId });

		const items = selections
			.map((selection) =>
				Object.assign(new OrderPatternEntity(), {
					state: selection.active ? ModelState.ACTIVE : ModelState.INACTIVE,
					pattern:
						selection.patternId === null
							? null
							: Object.assign(new PatternEntity(), {
								id: selection.patternId,
								state: ModelState.ACTIVE,
							}),
					color: selection.color,
					sizes: selection.sizes
						.map((size) =>
							Object.assign(new PatternSizeEntity(), {
								id: size.id,
								state: size.active ? ModelState.ACTIVE : ModelState.INACTIVE,
							}),
						),
				}),
			);

		await this.addBoughtPatterns(user, items, manager);
	}

	/**
	 * Загружает активные покупки пользователя вместе со схемами и размерами; при наличии manager использует
	 * его транзакцию.
	 */
	public async getBoughtPatternsByUser(
		user: Pick<UserEntity, "id">,
		manager?: EntityManager,
	): Promise<UserPatternEntity[]> {
		return (manager?.getRepository(UserPatternEntity) ?? this.userPatternRepository)
			.find({
				where: {
					user: {
						id: user.id,
					},
					state: ModelState.ACTIVE,
				},
				relations: {
					pattern: true,
					sizes: {
						size: true,
					},
				},
			});
	}

	// Вызывается в транзакции с заблокированной строкой пользователя.
	/**
	 * Объединяет права на активные схемы, размеры и цвет с прежними покупками в транзакции; не дублирует
	 * размеры и не отзывает уже купленный цвет.
	 */
	public async addBoughtPatterns(
		user: UserEntity,
		patterns: OrderPatternEntity[],
		manager: EntityManager,
	): Promise<void> {
		const repository = manager.getRepository(UserPatternEntity);

		const boughtPatterns = await repository
			.find({
				where: {
					user: {
						id: user.id,
					},
					state: ModelState.ACTIVE,
				},
				relations: {
					pattern: true,
					sizes: true,
				},
			});

		const boughtByPattern = new Map(
			boughtPatterns
				.filter((item) => item.pattern)
				.map((item) => [item.pattern.id, item]),
		);

		for (const item of patterns) {
			if (item.state !== ModelState.ACTIVE || item.pattern?.state !== ModelState.ACTIVE) {
				continue;
			}

			let bought = boughtByPattern.get(item.pattern.id);

			if (!bought) {
				bought = repository.create({
					user,
					pattern: item.pattern,
					sizes: [],
					color: false,
				});
				boughtByPattern.set(item.pattern.id, bought);
			}

			const sizes = new Map((bought.sizes ?? [])
				.map((size) => [size.id, size]));

			for (const size of item.sizes ?? []) {
				if (size.state === ModelState.ACTIVE && !sizes.has(size.id)) {
					sizes.set(size.id, size);
				}
			}

			const color = bought.color || item.color;

			if (!bought.id || sizes.size !== (bought.sizes ?? []).length || color !== bought.color) {
				bought.sizes = [...sizes
					.values()];
				bought.color = color;
				await repository.save(bought);
			}
		}
	}
}
