import { ModelState } from "@am-back/db/abstract/abstract.model";
import { AdminOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, type FindOneOptions, In, Repository, type SelectQueryBuilder } from "typeorm";
import type { AdminOrdersPaginatedFilters } from "../types/admin-orders-filters";


type AdminOrderIdRow = { id: number | string };

@Injectable()
export class AdminOrderRepository extends Repository<AdminOrderEntity> {
	/** Инициализирует TypeORM-репозиторий административных заказов менеджером источника данных. */
	constructor(dataSource: DataSource) {
		super(AdminOrderEntity, dataSource.createEntityManager());
	}

	/**
	 * Загружает активный административный заказ с полным каталогом, выбранными размерами и файлами для
	 * подробного просмотра.
	 */
	public findDetail(id: number): Promise<AdminOrderEntity | null> {
		return this.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: {
				patterns: {
					sizes: {
						size: true,
					},
					pattern: {
						name: true,
						description: true,
						basePrice: true,
						additionalPrice: true,
						colorPrice: true,
						images: true,
						categories: true,
						color: true,
						sizes: {
							size: true,
							cbb: true,
							pdf: true,
							png: true,
						},
					},
				},
			},
			order: {
				patterns: {
					id: "ASC",
					pattern: {
						images: {
							index: "ASC",
						},
					},
				},
			},
		});
	}

	/**
	 * Загружает активный административный заказ с CBB/PDF выбранных размеров; проверка завершённости
	 * выполняется вызывающим сервисом.
	 */
	public findDownload(id: number): Promise<AdminOrderEntity | null> {
		return this.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: {
				patterns: {
					sizes: {
						cbb: true,
						pdf: true,
					},
				},
			},
		});
	}

	/**
	 * Выбирает идентификаторы страницы завершённых заказов с фильтрами и устойчивой сортировкой по дате и
	 * id по убыванию.
	 */
	public async findPageIds(
		filters: AdminOrdersPaginatedFilters,
		take: number,
		skip: number,
		manager?: EntityManager,
	): Promise<number[]> {
		// Читаем только id и дату страницы завершённых заказов с устойчивой сортировкой до загрузки позиций.
		const rows = await this.filteredQuery(filters, manager)
			.select("adminOrder.id", "id")
			.addSelect("adminOrder.createdAt", "createdAt")
			.orderBy("adminOrder.createdAt", "DESC")
			.addOrderBy("adminOrder.id", "DESC")
			.limit(take)
			.offset(skip)
			.getRawMany<AdminOrderIdRow>();

		return rows
			.map((row: AdminOrderIdRow) => Number(row.id));
	}

	/**
	 * Загружает краткие данные активных завершённых заказов и восстанавливает порядок переданного списка
	 * идентификаторов.
	 */
	public async findPageRows(ids: number[], manager?: EntityManager): Promise<AdminOrderEntity[]> {
		if (!ids.length) {
			return [];
		}

		const orders = await this.using(manager)
			.find({
				where: {
					id: In(ids),
					state: ModelState.ACTIVE,
					isComplete: true,
				},
				relations: {
					patterns: {
						pattern: {
							name: true,
						},
					},
				},
				select: {
					id: true,
					email: true,
					vk: true,
					isComplete: true,
					createdAt: true,
					updatedAt: true,
					patterns: {
						id: true,
						pattern: {
							id: true,
							name: {
								id: true,
								ru: true,
								en: true,
							},
						},
					},
				},
				order: {
					patterns: {
						id: "ASC",
					},
				},
			});

		const byId = new Map(orders
			.map((order) => [order.id, order]));

		return ids
			.map((id) => byId.get(id))
			.filter((order): order is AdminOrderEntity => order !== undefined);
	}

	/** Считает активные завершённые административные заказы с теми же фильтрами, что и список. */
	public countCompleted(filters: AdminOrdersPaginatedFilters, manager?: EntityManager): Promise<number> {
		// Считаем завершённые активные заказы с теми же контактными и временными фильтрами, что и страница.
		return this.filteredQuery(filters, manager).getCount();
	}

	/**
	 * Строит запрос активных завершённых заказов с необязательными фильтрами email, VK и включительными
	 * границами даты создания.
	 */
	private filteredQuery(
		filters: AdminOrdersPaginatedFilters,
		manager?: EntityManager,
	): SelectQueryBuilder<AdminOrderEntity> {
		// Выбираем только активные завершённые административные заказы; фильтры контактов и дат добавляются ниже
		// параметризованно.
		const queryBuilder = this.using(manager)
			.createQueryBuilder("adminOrder")
			.where("adminOrder.state = :state", {
				state: ModelState.ACTIVE,
			})
			.andWhere("adminOrder.isComplete = :isComplete", { isComplete: true });

		if (filters.email?.trim()) {
			// Ищем подстроку email без учёта регистра, передавая значение параметром запроса.
			queryBuilder.andWhere("adminOrder.email ILIKE :email", {
				email: `%${filters.email.trim()}%`,
			});
		}

		if (filters.vk?.trim()) {
			// Ищем подстроку VK без учёта регистра, передавая значение параметром запроса.
			queryBuilder.andWhere("adminOrder.vk ILIKE :vk", {
				vk: `%${filters.vk.trim()}%`,
			});
		}

		if (filters.startDate) {
			// Включаем заказы, созданные начиная с указанной даты, включая саму границу.
			queryBuilder.andWhere("adminOrder.createdAt >= :startDate", {
				startDate: filters.startDate,
			});
		}

		if (filters.endDate) {
			// Включаем заказы, созданные не позднее указанной даты, включая саму границу.
			queryBuilder.andWhere("adminOrder.createdAt <= :endDate", {
				endDate: filters.endDate,
			});
		}

		return queryBuilder;
	}

	/**
	 * Загружает последнюю активную незавершённую административную корзину с позициями. При блокировке
	 * требует транзакцию и загружает связи отдельно, блокируя только строку заказа.
	 */
	public async findCart(
		manager?: EntityManager,
		lock?: FindOneOptions<AdminOrderEntity>["lock"],
	): Promise<AdminOrderEntity> {
		return this.using(manager).findOne({
			where: {
				isComplete: false,
				state: ModelState.ACTIVE,
			},
			order: {
				createdAt: "DESC",
				id: "DESC",
			},
			lock,
			// Load relations separately so PostgreSQL only locks the order row.
			relationLoadStrategy: lock ? "query" : "join",
			relations: {
				patterns: {
					sizes: {
						size: true,
					},
					pattern: {
						name: true,
						basePrice: true,
						additionalPrice: true,
						colorPrice: true,
					},
				},
			},
		});
	}

	/**
	 * Сериализует операции с общей административной корзиной advisory-блокировкой до окончания переданной
	 * транзакции.
	 */
	public async lockCart(manager: EntityManager): Promise<void> {
		// Удерживаем общую advisory-блокировку административной корзины до конца транзакции, предотвращая
		// параллельное создание и завершение.
		await manager.query("SELECT pg_advisory_xact_lock($1, $2)", [0x414d5354, 2]);
	}

	/**
	 * Возвращает все активные незавершённые административные корзины от новых к старым для устранения
	 * дублей.
	 */
	public findOpenCarts(manager: EntityManager): Promise<AdminOrderEntity[]> {
		return this.using(manager)
			.find({
				where: {
					isComplete: false,
					state: ModelState.ACTIVE,
				},
				order: {
					createdAt: "DESC",
					id: "DESC",
				},
			});
	}

	/** Архивирует переданные административные корзины, сохраняя их с состоянием INACTIVE в транзакции. */
	public async archiveCarts(orders: AdminOrderEntity[], manager: EntityManager): Promise<void> {
		await this.using(manager).save(
			orders
				.map((order) => ({
					...order,
					state: ModelState.INACTIVE,
				})),
		);
	}

	/**
	 * Создаёт пустую незавершённую административную корзину без email; при переданном manager сохраняет её
	 * в его транзакции.
	 */
	public createEmptyCart(manager?: EntityManager): Promise<AdminOrderEntity> {
		const repository = this.using(manager);

		return repository.save(
			repository.create({
				email: "",
				isComplete: false,
				patterns: [],
			}),
		);
	}

	/** Сохраняет административную корзину через переданный manager либо основной репозиторий. */
	public saveCart(order: AdminOrderEntity, manager?: EntityManager): Promise<AdminOrderEntity> {
		return this.using(manager).save(order);
	}

	/** Находит активный административный заказ по идентификатору без проверки завершённости. */
	public findActive(id: number): Promise<AdminOrderEntity | null> {
		return this.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
		});
	}

	/**
	 * Загружает активный завершённый административный заказ с данными для фиксации личной покупки в
	 * переданной транзакции.
	 */
	public findPurchaseSource(id: number, manager: EntityManager): Promise<AdminOrderEntity | null> {
		return this.using(manager).findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
				isComplete: true,
			},
			relations: {
				patterns: {
					sizes: { size: true },
					pattern: {
						name: true,
						basePrice: true,
						additionalPrice: true,
						colorPrice: true,
					},
				},
			},
		});
	}

	/**
	 * Загружает активный административный заказ с названиями, категориями, изображениями, ценами и CBB/PDF
	 * для письма.
	 */
	public findForMail(id: number): Promise<AdminOrderEntity | null> {
		return this.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: {
				patterns: {
					sizes: {
						size: true,
						cbb: true,
						pdf: true,
					},
					pattern: {
						name: true,
						categories: { label: true },
						images: true,
						basePrice: true,
						additionalPrice: true,
						colorPrice: true,
					},
				},
			},
			order: {
				patterns: { id: "ASC" },
			},
		});
	}

	/**
	 * Возвращает репозиторий из переданного manager либо основной репозиторий при отсутствии
	 * транзакционного контекста.
	 */
	private using(manager?: EntityManager): Repository<AdminOrderEntity> {
		return manager?.getRepository(AdminOrderEntity) ?? this;
	}
}
