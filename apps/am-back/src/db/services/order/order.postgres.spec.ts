import { ModelState } from "@am-back/db/abstract/abstract.model";
import { DataSourceService } from "@am-back/db/data-source.service";
import { LabelLangEntity } from "@am-back/db/entities/common/label-lang.entity";
import { NumberLangEntity } from "@am-back/db/entities/common/number-lang.entity";
import { OrderPatternEntity, UserPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "@am-back/db/entities/patterns/pattern-size.entity";
import { PatternEntity } from "@am-back/db/entities/patterns/pattern.entity";
import { SizeEntity } from "@am-back/db/entities/patterns/size.entity";
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { UserEntity } from "@am-back/db/entities/user.entity";
import { AppSettingsService } from "@am-back/db/service/app-settings/app-settings.service";
import { AppSettingsRepository } from "@am-back/db/service/app-settings/repositories/app-settings.repository";
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { PatternOrdersService } from "@am-back/db/service/patterns/pattern-orders.service";
import { PatternsSizeService } from "@am-back/db/service/patterns/pattern-sizes.service";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { DataSource } from "typeorm";
import { VersionedAppSettings1793500000000 } from "../../../../database/migrations/1793500000000-versioned-app-settings";
import { UserOrderSnapshots1793800000000 } from "../../../../database/migrations/1793800000000-user-order-snapshots";
import { orderTestModule } from "../../../../test/feature-services";
import { AdminOrderService } from "./admin/admin-order.service";
import { AdminCartService } from "./cart/admin-cart.service";
import { UserCartService } from "./cart/user-cart.service";
import { OrderCheckoutService } from "./checkout/order-checkout.service";
import { OrderPatternRepository } from "./repositories/order-pattern.repository";
import { UserOrderRepository } from "./repositories/user-order.repository";
import type { OrderPlacement } from "./types/order-placement";
import { UserOrderService } from "./user/user-order.service";


const url = process.env.ORDER_TEST_DATABASE_URL;

const postgres = url ? describe : describe.skip;

// Только отдельная случайная БД; исходная БД из URL не изменяется.
postgres("user order migration and invariants on PostgreSQL", () => {
	const database = `ams7_test_${randomUUID().replace(/-/g, "")}`;
	const migration = new UserOrderSnapshots1793800000000();

	let admin: DataSource;
	let db: DataSource;
	let user: UserEntity;
	let other: UserEntity;
	let pattern: PatternEntity;
	let size: PatternSizeEntity;
	let orders: UserOrderService;
	let carts: UserCartService;
	let orderRepository: UserOrderRepository;
	let purchases: UserOrderService;
	let itemRepository: OrderPatternRepository;
	let adminCart: AdminCartService;
	let completeAdmin: AdminOrderService;
	let listAdmin: AdminOrderService;
	let getAdmin: AdminOrderService;
	let snapshots: OrderCheckoutService;
	let expiration: OrderCheckoutService;

	beforeAll(async () => {
		admin = await new DataSource({
			type: "postgres",
			url,
		}).initialize();
		// Создаём отдельную БД для интеграционных тестов исторических заказов.
		await admin.query(`CREATE DATABASE "${database}"`);

		const testUrl = new URL(url);

		testUrl.pathname = `/${database}`;
		db = await new DataSource({
			type: "postgres",
			url: testUrl.toString(),
			entities: [join(__dirname, "../../entities/**/*.entity.ts")],
			extra: { max: 12 },
		}).initialize();
	});

	beforeEach(async () => {
		// Получаем реальную схему сущностей и снимаем только изменения AMS-7.
		// Миграция затем выполняется над существующими строками, без synchronize после up.
		await db.query(
			"DROP SCHEMA IF EXISTS patterns CASCADE; DROP SCHEMA IF EXISTS users CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE SCHEMA patterns; CREATE SCHEMA users",
		);
		await db.synchronize();
		await db.transaction((manager) => migration.down(manager.queryRunner));
		// Убираем поля и ограничения окна оплаты, чтобы воспроизвести схему до применения миграций.
		await db.query(`ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "CHK_pending_order_payment_window",
            DROP CONSTRAINT "FK_order_app_settings", DROP COLUMN "paymentExpiresAt", DROP COLUMN "appSettingsVersion",
            DROP COLUMN "cancelledAt", DROP COLUMN "cancelReason"`);
		// Удаляем тестовую таблицу настроек перед повторным применением её миграции.
		await db.query('DROP TABLE "app_setting_entity"');
		// Восстанавливаем исходный enum статусов в тестовой БД, сохраняя значения через text-приведение и
		// возвращая default OPEN.
		await db.query(`ALTER TYPE "users"."user_order_entity_status_enum" RENAME TO "user_order_entity_status_enum_new";
            CREATE TYPE "users"."user_order_entity_status_enum" AS ENUM ('open', 'success', 'cancel');
            ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" DROP DEFAULT;
            ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" TYPE "users"."user_order_entity_status_enum" USING "status"::text::"users"."user_order_entity_status_enum";
            ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" SET DEFAULT 'open';
            DROP TYPE "users"."user_order_entity_status_enum_new"`);
		await db.transaction((manager) => new VersionedAppSettings1793500000000().up(manager.queryRunner));
		user = await db.getRepository(UserEntity).save({ email: "buyer@example.test" });
		other = await db.getRepository(UserEntity).save({ email: "other@example.test" });

		const name = await db.getRepository(LabelLangEntity).save({
			ru: "Историческая схема",
			en: "Pattern",
		});

		const prices = await db.getRepository(NumberLangEntity).save([
			{
				ru: 1.01,
				en: 2,
			},
			{
				ru: 0.2,
				en: 0.1,
			},
			{
				ru: 0.29,
				en: 0.3,
			},
		]);

		pattern = await db.getRepository(PatternEntity).save({
			name,
			basePrice: prices[0],
			additionalPrice: prices[1],
			colorPrice: prices[2],
		});

		const definition = await db.getRepository(SizeEntity).save({ value: 36 });

		size = await db.getRepository(PatternSizeEntity).save({
			pattern,
			size: definition,
		});

		const module = await orderTestModule(db);

		orders = module.get(UserOrderService);
		carts = module.get(UserCartService);
		orderRepository = module.get(UserOrderRepository);
		purchases = module.get(UserOrderService);
		itemRepository = module.get(OrderPatternRepository);
		adminCart = module.get(AdminCartService);
		completeAdmin = module.get(AdminOrderService);
		listAdmin = module.get(AdminOrderService);
		getAdmin = module.get(AdminOrderService);
		snapshots = module.get(OrderCheckoutService);
		expiration = module.get(OrderCheckoutService);
	}, 30_000);

	afterAll(async () => {
		if (db?.isInitialized) {
			await db.destroy();
		}

		if (admin?.isInitialized) {
			// Удаляем изолированную БД тестов заказов, завершая оставшиеся подключения.
			await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
			await admin.destroy();
		}
	});

	/** Обеспечивает существование открытой корзины тестового покупателя и загружает её из репозитория. */
	async function openCart(buyer: UserEntity): Promise<UserOrderEntity> {
		await carts.getUserCart(buyer.id);
		return orderRepository.findOpenCart(buyer.id);
	}

	/**
	 * Применяет тестируемую миграцию snapshot в отдельной транзакции, включая временные таблицы ON COMMIT
	 * DROP.
	 */
	async function apply(): Promise<void> {
		await db.transaction((manager) => migration.up(manager.queryRunner));
	}

	/** Добавляет в тестовую корзину позицию с подготовленной схемой, размером и цветом. */
	async function cartItem(cart: Pick<UserOrderEntity, "id">): Promise<OrderPatternEntity> {
		return db.getRepository(OrderPatternEntity).save({
			order: {
				id: cart.id,
			},
			pattern,
			sizes: [size],
			color: true,
			requiresPatternPurchase: true,
		});
	}

	/** Создаёт тестовую корзину с позицией и в одной транзакции фиксирует цену и открывает окно оплаты. */
	async function pending(): Promise<{ order: OrderPlacement; item: OrderPatternEntity }> {
		const cart = await openCart(user);
		const item = await cartItem(cart);

		const order = await db.transaction(async (manager) => {
			await snapshots.capture(cart.id, user.id, "RUB", manager);
			return expiration.startPaymentWindow(cart.id, user.id, manager);
		});

		return {
			order,
			item,
		};
	}

	it("keeps legacy statuses, admin links and unknown prices; merges duplicate carts without losing selections", async () => {
		// Создаём старый оплаченный заказ без денежного snapshot для проверки совместимости миграции.
		const [legacy] = await db.query(
			`INSERT INTO "users"."user_order_entity" ("userId", "status") VALUES ($1, 'success') RETURNING "id"`,
			[user.id],
		);

		// Создаём две открытые корзины одного пользователя до установки уникального индекса.
		const [first, second] = await db.query(
			`INSERT INTO "users"."user_order_entity" ("userId") VALUES ($1), ($1) RETURNING "id"`,
			[user.id],
		);

		// Добавляем повторяющуюся схему с различным выбором цвета в две старые корзины для проверки объединения.
		await db.query(
			`INSERT INTO "patterns"."order_pattern_entity" ("orderId", "patternId", "color") VALUES ($1, $3, true), ($2, $3, false)`,
			[first.id, second.id, pattern.id],
		);

		// Находим старую позицию первой корзины для добавления тестовой связи размера.
		const [{ id: itemId }] = await db.query(
			'SELECT "id" FROM "patterns"."order_pattern_entity" WHERE "orderId" = $1',
			[first.id],
		);

		// Привязываем выбранный размер к старой позиции перед объединением корзин миграцией.
		await db.query('INSERT INTO "patterns"."order_pattern_entity_sizes_pattern_size_entity" VALUES ($1, $2)', [
			itemId,
			size.id,
		]);

		const adminOrder = await db.getRepository(AdminOrderEntity).save({ isComplete: true });

		// Создаём старую личную покупку с административным источником для проверки совместимости истории.
		await db.query(
			`INSERT INTO "users"."user_order_entity" ("userId", "status", "sourceAdminOrderId") VALUES ($1, 'success', $2)`,
			[user.id, adminOrder.id],
		);

		const settings = await new AppSettingsService(new AppSettingsRepository(db), db).current();

		// Создаём старый ожидающий заказ с окном оплаты, но без денежного snapshot, чтобы проверить его отмену
		// миграцией.
		const [oldPending] = await db.query(
			`INSERT INTO "users"."user_order_entity" ("userId", "status", "paymentExpiresAt", "appSettingsVersion")
            VALUES ($1, 'pending_payment', now() + interval '7 days', $2) RETURNING "id"`,
			[user.id, settings.version],
		);

		await apply();
		await expect(
			db.getRepository(UserOrderEntity).findOneByOrFail({
				id: legacy.id,
			}),
		).resolves.toMatchObject({
			status: OrderStatus.PAID,
			totalAmount: null,
			currency: null,
			discountAmount: 0,
			discounts: [],
		});

		const cart = await openCart(user);

		expect(cart.id).toBe(second.id);
		expect(cart.patterns).toHaveLength(1);
		expect(cart.patterns[0]).toMatchObject({
			color: true,
			sizes: [
				{
					id: size.id,
				},
			],
		});
		expect(
			await db.getRepository(UserOrderEntity).countBy({
				user: {
					id: user.id,
				},
				status: OrderStatus.OPEN,
				state: ModelState.ACTIVE,
			}),
		).toBe(1);
		expect(
			await db.getRepository(UserOrderEntity).findOne({
				where: {
					sourceAdminOrder: {
						id: adminOrder.id,
					},
				},
				relations: { sourceAdminOrder: true },
			}),
		).toMatchObject({
			status: OrderStatus.PAID,
			sourceAdminOrder: {
				id: adminOrder.id,
			},
		});
		expect(
			await db.getRepository(UserOrderEntity).findOneByOrFail({
				id: oldPending.id,
			}),
		).toMatchObject({
			status: OrderStatus.CANCELLED,
			cancelReason: "legacy_missing_price_snapshot",
			totalAmount: null,
		});
	});

	it("enforces one active OPEN under concurrent creation, permits anonymous carts and multiple pending orders", async () => {
		await apply();

		const carts = await Promise.all(Array.from({ length: 8 }, () => openCart(user)));

		expect(new Set(carts
			.map((cart) => cart.id)).size).toBe(1);
		await expect(db.getRepository(UserOrderEntity).insert({ user })).rejects.toMatchObject({
			driverError: { code: "23505" },
		});
		await db.getRepository(UserOrderEntity).insert([{}, {}]);

		const first = await pending();
		const second = await pending();

		expect(first.order.id).not.toBe(second.order.id);
		expect(
			await db.getRepository(UserOrderEntity).countBy({
				user: {
					id: user.id,
				},
				status: OrderStatus.PENDING_PAYMENT,
			}),
		).toBe(2);
	});

	it("requires snapshots and balanced safe integer amounts before PENDING_PAYMENT", async () => {
		await apply();

		const cart = await openCart(user);

		await expect(
			db.transaction((manager) => expiration.startPaymentWindow(cart.id, user.id, manager)),
		).rejects.toMatchObject({ status: 400 });
		await expect(
			db.getRepository(UserOrderEntity).update(cart.id, {
				subtotalAmount: 1.5,
				totalAmount: 1.5,
				currency: "RUB",
			}),
		).rejects.toThrow();
		await expect(
			db.getRepository(UserOrderEntity).update(cart.id, {
				subtotalAmount: 1,
				totalAmount: 2,
				currency: "RUB",
			}),
		).rejects.toThrow();
		await expect(
			db.getRepository(UserOrderEntity).update(cart.id, {
				subtotalAmount: Number.MAX_SAFE_INTEGER + 1,
				totalAmount: Number.MAX_SAFE_INTEGER + 1,
				currency: "RUB",
			}),
		).rejects.toThrow();
		await expect(
			db.transaction(async (manager) => {
				await manager.getRepository(UserOrderEntity).update(cart.id, {
					subtotalAmount: 150,
					totalAmount: 150,
					currency: "RUB",
				});
				await expiration.startPaymentWindow(cart.id, user.id, manager);
			}),
		).rejects.toThrow("complete item snapshots");
		await expect(
			db.getRepository(UserOrderEntity).findOneByOrFail({
				id: cart.id,
			}),
		).resolves.toMatchObject({
			totalAmount: null,
			status: OrderStatus.OPEN,
		});
	});

	it("keeps name, sizes, color and monetary history after catalogue edits and physical deletion", async () => {
		await apply();

		const { order, item } = await pending();

		await db.getRepository(UserOrderEntity).update(order.id, {
			status: OrderStatus.PAID,
			paidAt: new Date(),
		});
		await db.getRepository(LabelLangEntity).update(pattern.name.id, { ru: "Другое имя" });
		await db.getRepository(NumberLangEntity).update(pattern.basePrice.id, { ru: 9999 });
		await db.getRepository(SizeEntity).update(size.size.id, { value: 99 });

		const details = await orders.getCompletedUserOrder(user.id, order.id);

		expect(details).toMatchObject({
			subtotalAmount: 150,
			totalAmount: 150,
			discountAmount: 0,
			discounts: [],
			currency: "RUB",
			patterns: [
				{
					name: { ru: "Историческая схема" },
					sizes: [
						{
							size: { value: 36 },
						},
					],
					color: true,
					snapshot: { totalAmount: 150 },
				},
			],
		});
		await db.getRepository(PatternSizeEntity).delete(size.id);
		await db.getRepository(PatternEntity).delete(pattern.id);
		expect((await orders.getCompletedUserOrder(user.id, order.id)).patterns).toEqual(details.patterns);
		expect(
			await db.getRepository(OrderPatternEntity).findOneByOrFail({
				id: item.id,
			}),
		).toMatchObject({
			snapshot: {
				patternId: pattern.id,
				sizes: [{ value: 36 }],
			},
		});
		await expect(orders.getCompletedUserOrder(other.id, order.id)).rejects.toMatchObject({ status: 400 });
	});

	it("rejects placement if the selection changes after capture and permits a new server calculation", async () => {
		await apply();

		const cart = await openCart(user);
		const item = await cartItem(cart);

		await expect(
			db.transaction(async (manager) => {
				await snapshots.capture(cart.id, user.id, "RUB", manager);
				await manager.getRepository(OrderPatternEntity).update(item.id, { color: false });
				await expiration.startPaymentWindow(cart.id, user.id, manager);
			}),
		).rejects.toThrow("complete item snapshots");
		expect(
			await db.getRepository(UserOrderEntity).findOneByOrFail({
				id: cart.id,
			}),
		).toMatchObject({
			status: OrderStatus.OPEN,
			totalAmount: null,
		});

		const placed = await db.transaction(async (manager) => {
			await snapshots.capture(cart.id, user.id, "RUB", manager);
			return expiration.startPaymentWindow(cart.id, user.id, manager);
		});

		expect(placed.totalAmount).toBe(150);
	});

	it("rejects edits, additions, reparenting, deletion and size-junction writes through repositories and SQL", async () => {
		await apply();

		const { order, item } = await pending();
		const nextCart = await openCart(user);

		await expect(
			db.getRepository(UserOrderEntity).update(order.id, {
				totalAmount: 0,
				subtotalAmount: 0,
			}),
		).rejects.toThrow("immutable");
		await expect(db.getRepository(UserOrderEntity).delete(order.id)).rejects.toThrow("immutable");
		await expect(
			db.getRepository(UserOrderEntity).update(order.id, {
				status: OrderStatus.OPEN,
			}),
		).rejects.toThrow();
		await expect(db.getRepository(OrderPatternEntity).update(item.id, { color: false })).rejects.toThrow(
			"immutable",
		);
		await expect(db.getRepository(OrderPatternEntity).update(item.id, { snapshot: null })).rejects.toThrow(
			"immutable",
		);
		await expect(db.getRepository(OrderPatternEntity).update(item.id, { order: nextCart })).rejects.toThrow(
			"immutable",
		);
		await expect(db.getRepository(OrderPatternEntity).delete(item.id)).rejects.toThrow("immutable");
		await expect(db.getRepository(OrderPatternEntity).clear()).rejects.toThrow();
		// Проверяем, что TRUNCATE CASCADE не обходит защиту истории оформленных заказов.
		await expect(db.query('TRUNCATE "users"."user_order_entity" CASCADE')).rejects.toThrow("immutable");
		await expect(cartItem(order)).rejects.toThrow("immutable");
		// Проверяем запрет удаления связи размера оформленной позиции прямым SQL.
		await expect(
			db.query(
				'DELETE FROM "patterns"."order_pattern_entity_sizes_pattern_size_entity" WHERE "orderPatternEntityId" = $1',
				[item.id],
			),
		).rejects.toThrow("immutable");
		// Проверяем, что даже обновление связи размера без изменения значения не обходит защиту оформленной
		// позиции.
		await expect(
			db.query(
				'UPDATE "patterns"."order_pattern_entity_sizes_pattern_size_entity" SET "orderPatternEntityId" = "orderPatternEntityId" WHERE "orderPatternEntityId" = $1',
				[item.id],
			),
		).rejects.toThrow("immutable");

		const patterns = new PatternOrdersService(
			new DataSourceService(db),
			{} as CommonEntitiesService,
			{} as PatternsService,
			{} as PatternsSizeService,
		);

		await expect(patterns.removeOrderPatter(item)).rejects.toMatchObject({ status: 400 });
		await expect(
			patterns.createOrderPattern(
				{
					pattern: pattern.id,
					sizes: [size.id],
					color: false,
					requiresPatternPurchase: true,
				},
				{
					order: Object.assign(new UserOrderEntity(), {
						id: order.id,
					}),
				},
			),
		).rejects.toMatchObject({ status: 400 });
		await expect(
			db.transaction((manager) => snapshots.capture(order.id, user.id, "RUB", manager)),
		).rejects.toMatchObject({ status: 400 });
	});

	it("serializes a direct concurrent item write with placement and rejects it after commit", async () => {
		await apply();

		const cart = await openCart(user);
		const item = await cartItem(cart);
		const runner = db.createQueryRunner();

		await runner.startTransaction();
		let edit: Promise<unknown>;
		try {
			await snapshots.capture(cart.id, user.id, "RUB", runner.manager);
			await expiration.startPaymentWindow(cart.id, user.id, runner.manager);
			edit = db.getRepository(OrderPatternEntity).update(item.id, { color: false });

			// Обработчик вешается сразу: rejection может прийти до await.
			const rejected = expect(edit).rejects.toThrow("immutable");
			const deadline = Date.now() + 3000;

			let blocked = false;
			while (Date.now() < deadline) {
				// Ждём фактического ожидания блокировки обновлением позиции, чтобы проверить конкуренцию с
				// оформлением заказа.
				const [{ waiting }] = await db.query(
					`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'UPDATE%order_pattern_entity%') AS waiting`,
				);

				if (waiting) {
					blocked = true;
					break;
				}

				await new Promise((resolve) => setImmediate(resolve));
			}
			expect(blocked).toBe(true);
			await runner.commitTransaction();
			await rejected;
		} finally {
			if (runner.isTransactionActive) {
				await runner.rollbackTransaction();
			}

			await runner.release();

			if (edit) {
				await edit.catch(() => undefined);
			}
		}
	});

	it("supports terminal status transitions without reopening or changing history", async () => {
		await apply();

		const { order } = await pending();

		await db.getRepository(UserOrderEntity).update(order.id, {
			status: OrderStatus.PAID,
			paidAt: new Date(),
		});
		await db.getRepository(UserOrderEntity).update(order.id, {
			status: OrderStatus.PARTIALLY_REFUNDED,
		});
		await db.getRepository(UserOrderEntity).update(order.id, {
			status: OrderStatus.REFUNDED,
		});
		await expect(
			db.getRepository(UserOrderEntity).update(order.id, {
				status: OrderStatus.PAID,
			}),
		).rejects.toThrow();
		expect(
			await db.getRepository(UserOrderEntity).findOneByOrFail({
				id: order.id,
			}),
		).toMatchObject({
			status: OrderStatus.REFUNDED,
			totalAmount: 150,
		});
	});

	it("creates a separate immutable admin purchase with snapshots and rights without replacing the active cart", async () => {
		await apply();

		const cart = await openCart(user);

		await cartItem(cart);

		const adminOrder = await db.getRepository(AdminOrderEntity).save({
			email: user.email,
			isComplete: true,
		});

		const item = await db.getRepository(OrderPatternEntity).save({
			adminOrder,
			pattern,
			sizes: [size],
			color: true,
			requiresPatternPurchase: true,
		});

		adminOrder.patterns = [item];

		const orderId = await db.transaction((manager) => purchases.createFromAdminOrder(adminOrder.id, manager));

		const order = await db.getRepository(UserOrderEntity).findOneOrFail({
			where: { id: orderId },
			relations: { patterns: true },
		});

		expect(order).toMatchObject({
			status: OrderStatus.PAID,
			state: ModelState.ACTIVE,
			totalAmount: 150,
			currency: "RUB",
			paidAt: expect.any(Date),
			patterns: [
				{
					snapshot: {
						name: { ru: "Историческая схема" },
						totalAmount: 150,
					},
				},
			],
		});
		expect((await openCart(user)).id).toBe(cart.id);
		expect(
			await db.getRepository(UserPatternEntity)
				.find({
					where: {
						user: {
							id: user.id,
						},
					},
					relations: { sizes: true },
				}),
		).toMatchObject([
			{
				color: true,
				sizes: [
					{
						id: size.id,
					},
				],
			},
		]);
		await expect(
			db.getRepository(OrderPatternEntity).update(order.patterns[0].id, { color: false }),
		).rejects.toThrow("immutable");

		const repeated = await db.transaction((manager) => purchases.createFromAdminOrder(adminOrder.id, manager));

		expect(repeated).toBe(order.id);
	});

	it("rolls snapshot and placement back together and rejects foreign or nontransactional capture", async () => {
		await apply();

		const cart = await openCart(user);
		const item = await cartItem(cart);

		await expect(snapshots.capture(cart.id, user.id, "RUB", db.manager)).rejects.toThrow("active transaction");
		await expect(
			db.transaction((manager) => snapshots.capture(cart.id, other.id, "RUB", manager)),
		).rejects.toMatchObject({ status: 400 });
		await expect(
			db.transaction(async (manager) => {
				await snapshots.capture(cart.id, user.id, "RUB", manager);
				await expiration.startPaymentWindow(cart.id, user.id, manager);
				throw new Error("checkout failed");
			}),
		).rejects.toThrow("checkout failed");
		expect(
			await db.getRepository(UserOrderEntity).findOneByOrFail({
				id: cart.id,
			}),
		).toMatchObject({
			status: OrderStatus.OPEN,
			subtotalAmount: null,
			totalAmount: null,
		});
		expect(
			await db.getRepository(OrderPatternEntity).findOneByOrFail({
				id: item.id,
			}),
		).toMatchObject({
			snapshot: null,
		});
	});

	it("rolls a replacement back when selecting the new item fails after deletion", async () => {
		await apply();

		const cart = await openCart(user);
		const previous = await cartItem(cart);

		const insertion = jest
			.spyOn(itemRepository, "insertSelection")
			.mockRejectedValueOnce(new Error("write failed"));

		try {
			await expect(
				carts.addToUserCart(user.id, {
					pattern: pattern.id,
					sizes: [size.size.id],
					color: false,
					requiresPatternPurchase: true,
				}),
			).rejects.toThrow("write failed");
			expect(
				await db.getRepository(OrderPatternEntity).findOneByOrFail({
					id: previous.id,
				}),
			).toMatchObject({
				color: true,
			});
			expect((await openCart(user)).patterns
				.map((item) => item.id)).toEqual([previous.id]);
		} finally {
			insertion.mockRestore();
		}
	});

	it("serializes concurrent user replacements and exposes only the cart DTO", async () => {
		await apply();

		const input = {
			pattern: pattern.id,
			sizes: [size.size.id],
			color: true,
			requiresPatternPurchase: true,
		};

		const results = await Promise.all(Array.from({ length: 4 }, () => carts.addToUserCart(user.id, input)));
		const current = await openCart(user);

		expect(current.patterns).toHaveLength(1);
		expect(
			await db.getRepository(UserOrderEntity).countBy({
				user: {
					id: user.id,
				},
				status: OrderStatus.OPEN,
				state: ModelState.ACTIVE,
			}),
		).toBe(1);
		for (const result of results) {
			expect(result.cart.patterns).toHaveLength(1);
			expect(result.cart).not.toHaveProperty("user");
			expect(result.cart).not.toHaveProperty("sourceAdminOrder");
			expect(result.cart).not.toHaveProperty("state");
		}
	});

	it("serializes the shared admin cart, commits its purchase and safely lists deleted catalogue entries", async () => {
		await apply();

		const responses = await Promise.all(Array.from({ length: 4 }, () => adminCart.getActualCart()));

		expect(new Set(responses
			.map((response) => response.order.id)).size).toBe(1);

		const input = {
			pattern: pattern.id,
			sizes: [size.size.id],
			color: true,
			requiresPatternPurchase: true,
		};

		await adminCart.addToCart(input);

		const completed = await completeAdmin.completeOrder({
			email: user.email,
		});

		expect(completed.order.id).not.toBe(responses[0].order.id);
		expect(completed.order.patterns).toEqual([]);

		const personal = await db.getRepository(UserOrderEntity).findOneByOrFail({
			user: {
				id: user.id,
			},
			status: OrderStatus.PAID,
		});

		expect(personal.totalAmount).toBe(150);

		const page = await listAdmin.paginatedAdminOrder(1, { email: "BUYER" });

		expect(page).toMatchObject({
			page: 1,
			count: 1,
			items: [
				{
					patterns: [
						{
							name: { ru: "Историческая схема" },
						},
					],
				},
			],
		});
		expect(page.items[0]).not.toHaveProperty("state");
		await db.getRepository(PatternEntity).delete(pattern.id);
		expect((await listAdmin.paginatedAdminOrder(1)).items[0].patterns).toEqual([{ name: null }]);
		expect((await getAdmin.getAdminOrderById(page.items[0].id)).patterns[0].pattern).toBeNull();
		await expect(listAdmin.paginatedAdminOrder(0)).rejects.toMatchObject({ status: 400 });
	});

	it("can roll the migration back without deleting legacy orders or changing purchase rights", async () => {
		// Создаём старый оплаченный заказ для проверки сохранения истории при откате миграции.
		const [legacy] = await db.query(
			`INSERT INTO "users"."user_order_entity" ("userId", "status") VALUES ($1, 'success') RETURNING "id"`,
			[user.id],
		);

		await apply();
		await db.transaction((manager) => migration.down(manager.queryRunner));
		// Проверяем, что откат сохраняет статус старого оплаченного заказа.
		expect(await db.query('SELECT "status" FROM "users"."user_order_entity" WHERE "id" = $1', [legacy.id])).toEqual(
			[{ status: "success" }],
		);
		// Проверяем возможность создать две OPEN-корзины после удаления уникального индекса при откате.
		await db.query(`INSERT INTO "users"."user_order_entity" ("userId") VALUES ($1), ($1)`, [user.id]);
	});
});
