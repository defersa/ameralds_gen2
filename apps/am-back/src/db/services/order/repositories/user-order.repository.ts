import { UserEntity } from "@am-back/db/entities/user.entity";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import type { OrderCurrency, OrderDiscountSnapshot } from "@am-back/db/entities/purchases/order-snapshot.model";
import { OrderStatus, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, Repository } from "typeorm";
import { PAYMENT_EXPIRED_REASON } from "../checkout/payment-window";


@Injectable()
export class UserOrderRepository extends Repository<UserOrderEntity> {
	/** Инициализирует TypeORM-репозиторий пользовательских заказов менеджером источника данных. */
	constructor(dataSource: DataSource) {
		super(UserOrderEntity, dataSource.createEntityManager());
	}

	/** Блокирует владельца до чтения прав и корзины; требует транзакцию и согласован с выдачей покупок. */
	public async lockOwner(userId: number, manager: EntityManager): Promise<void> {
		// Сериализуем изменения корзины и выдачу прав общей блокировкой строки пользователя.
		await manager.getRepository(UserEntity).findOneOrFail({
			where: { id: userId },
			lock: { mode: "pessimistic_write" },
		});
	}

	/** Загружает только активный оплаченный заказ указанного владельца с данными для личного просмотра. */
	public findCompletedOrder(userId: number, id: number): Promise<UserOrderEntity | null> {
		return this.findOne({
			where: {
				id,
				user: { id: userId },
				status: OrderStatus.PAID,
				state: ModelState.ACTIVE,
			},
			relations: {
				patterns: {
					pattern: {
						name: true,
						images: true,
					},
					sizes: { size: true },
				},
			},
			order: {
				patterns: {
					id: "ASC",
					pattern: {
						images: { index: "ASC" },
					},
				},
			},
		});
	}

	/**
	 * Создаёт OPEN-корзину пользователя, игнорируя конфликт уникального индекса единственной активной
	 * корзины.
	 */
	public async ensureOpenCart(userId: number, manager?: EntityManager): Promise<void> {
		// Вставляем OPEN-корзину; конфликт частичного уникального индекса игнорируется, чтобы параллельные
		// запросы использовали одну корзину.
		await this.using(manager)
			.createQueryBuilder()
			.insert()
			.values({
				user: { id: userId },
				status: OrderStatus.OPEN,
			})
			.orIgnore()
			.execute();
	}

	/**
	 * Загружает активную OPEN-корзину пользователя с выбранными позициями и ценами; при lock блокирует
	 * строку в переданной транзакции и отдельно загружает связи.
	 */
	public findOpenCart(userId: number, manager?: EntityManager, lock = false): Promise<UserOrderEntity | null> {
		return this.using(manager).findOne({
			where: {
				user: { id: userId },
				status: OrderStatus.OPEN,
				state: ModelState.ACTIVE,
			},
			...(lock
				? {
					lock: {
						mode: "pessimistic_write" as const,
					},
					relationLoadStrategy: "query" as const,
				}
				: {}),
			relations: {
				patterns: {
					sizes: { size: true },
					pattern: {
						basePrice: true,
						additionalPrice: true,
						colorPrice: true,
					},
				},
			},
		});
	}

	/**
	 * Находит ранее созданную личную покупку по административному источнику для защиты от повторного
	 * копирования.
	 */
	public findByAdminSource(adminOrderId: number, manager: EntityManager): Promise<UserOrderEntity | null> {
		return this.using(manager).findOne({
			where: {
				sourceAdminOrder: { id: adminOrderId },
			},
		});
	}

	/**
	 * Создаёт неактивную OPEN-заготовку личной покупки с административным источником, не занимая уникальную
	 * активную корзину пользователя.
	 */
	public createAdminPurchase(userId: number, adminOrderId: number, manager: EntityManager): Promise<UserOrderEntity> {
		const repository = this.using(manager);

		return repository.save(
			repository.create({
				user: { id: userId },
				status: OrderStatus.OPEN,
				state: ModelState.INACTIVE,
				sourceAdminOrder: { id: adminOrderId },
			}),
		);
	}

	/** Сохраняет итоговое состояние личной покупки в транзакции завершения административного заказа. */
	public async finishAdminPurchase(order: UserOrderEntity, manager: EntityManager): Promise<void> {
		await this.using(manager).save(order);
	}

	/**
	 * Блокирует строку активного заказа указанного владельца для фиксации цены, отдельно загружая источник
	 * и позиции; требует активную транзакцию.
	 */
	public lockForSnapshot(orderId: number, userId: number, manager: EntityManager): Promise<UserOrderEntity | null> {
		return this.using(manager).findOne({
			where: {
				id: orderId,
				user: { id: userId },
				state: ModelState.ACTIVE,
			},
			lock: { mode: "pessimistic_write" },
			relationLoadStrategy: "query",
			relations: {
				sourceAdminOrder: true,
				patterns: {
					pattern: {
						name: true,
						basePrice: true,
						additionalPrice: true,
						colorPrice: true,
					},
					sizes: { size: true },
				},
			},
		});
	}

	/**
	 * Блокирует строку активного заказа указанного владельца для открытия окна оплаты и читает
	 * идентификатор административного источника; требует активную транзакцию.
	 */
	public lockForPayment(orderId: number, userId: number, manager: EntityManager): Promise<UserOrderEntity | null> {
		return this.using(manager).findOne({
			where: {
				id: orderId,
				user: { id: userId },
				state: ModelState.ACTIVE,
			},
			lock: { mode: "pessimistic_write" },
			loadRelationIds: {
				relations: ["sourceAdminOrder"],
			},
		});
	}

	/**
	 * Обновляет зафиксированные суммы, валюту и скидки заказа в переданной транзакции; суммы заданы в
	 * минимальных денежных единицах.
	 */
	public async fixAmounts(
		id: number,
		amounts: {
			subtotalAmount: number | null;
			discountAmount: number;
			totalAmount: number | null;
			currency: OrderCurrency | null;
			discounts: OrderDiscountSnapshot[];
		},
		manager: EntityManager,
	): Promise<void> {
		await this.using(manager).update(id, amounts);
	}

	/** Переводит заказ в PENDING_PAYMENT, сохраняя срок оплаты и версию настроек в переданной транзакции. */
	public async fixPaymentWindow(
		id: number,
		paymentExpiresAt: Date,
		appSettingsVersion: number,
		manager: EntityManager,
	): Promise<void> {
		await this.using(manager).update(id, {
			status: OrderStatus.PENDING_PAYMENT,
			paymentExpiresAt,
			appSettingsVersion,
		});
	}

	/**
	 * Возвращает фактическое время PostgreSQL через clock_timestamp, не привязанное к моменту начала
	 * транзакции.
	 */
	public async databaseTime(manager: EntityManager): Promise<Date> {
		// Читаем фактическое время БД после ожидания блокировок вместо времени начала транзакции.
		const rows: { now: Date }[] = await manager.query('SELECT clock_timestamp() AS "now"');

		return new Date(rows[0].now);
	}

	/**
	 * Атомарно отменяет активные просроченные PENDING_PAYMENT без административного источника, фиксирует
	 * время и причину отмены и возвращает число строк.
	 */
	public async cancelExpired(): Promise<number> {
		// Одним UPDATE отменяем только активные просроченные PENDING_PAYMENT без административного источника;
		// PostgreSQL повторно проверит условие после ожидания блокировки.
		const result = await this.createQueryBuilder()
			.update(UserOrderEntity)
			.set({
				status: OrderStatus.CANCELLED,
				cancelledAt: () => "clock_timestamp()",
				cancelReason: PAYMENT_EXPIRED_REASON,
			})
			.where("status = :status", {
				status: OrderStatus.PENDING_PAYMENT,
			})
			.andWhere("state = :state", {
				state: ModelState.ACTIVE,
			})
			.andWhere('"sourceAdminOrderId" IS NULL')
			.andWhere('"paymentExpiresAt" <= CURRENT_TIMESTAMP')
			.execute();

		return result.affected ?? 0;
	}

	/**
	 * Загружает активную оплаченную личную покупку по административному источнику только для активного
	 * пользователя; выбирает id и email для письма.
	 */
	public findPaidRecipient(adminOrderId: number): Promise<UserOrderEntity | null> {
		return this.findOne({
			where: {
				sourceAdminOrder: { id: adminOrderId },
				status: OrderStatus.PAID,
				state: ModelState.ACTIVE,
				user: {
					state: ModelState.ACTIVE,
				},
			},
			relations: { user: true },
			select: {
				id: true,
				user: {
					id: true,
					email: true,
				},
			},
		});
	}

	/** Возвращает репозиторий пользовательских заказов из переданного manager либо основной репозиторий. */
	private using(manager?: EntityManager): Repository<UserOrderEntity> {
		return manager?.getRepository(UserOrderEntity) ?? this;
	}
}
