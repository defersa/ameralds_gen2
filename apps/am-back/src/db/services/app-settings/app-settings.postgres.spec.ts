import { AppSettingEntity } from "@am-back/db/entities/app-setting.entity";
import { OrderStatus, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { OrderCheckoutService } from "@am-back/db/service/order/checkout/order-checkout.service";
import { OrderExpirationService } from "@am-back/db/service/order/checkout/order-expiration.service";
import { PAYMENT_EXPIRED_REASON } from "@am-back/db/service/order/checkout/payment-window";
import type { OrderPlacement } from "@am-back/db/service/order/types/order-placement";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { DataSource } from "typeorm";
import { VersionedAppSettings1793500000000 } from "../../../../database/migrations/1793500000000-versioned-app-settings";
import { settingsTestModule } from "../../../../test/feature-services";
import { AppSettingsService } from "./app-settings.service";
import { AppSettingsRepository } from "./repositories/app-settings.repository";


// URL PostgreSQL с правом CREATE DATABASE. Создаётся и удаляется только собственная
// случайно названная БД; данные исходной БД не изменяются. Пример запуска — в README.
const url = process.env.APP_SETTINGS_TEST_DATABASE_URL;

const postgres = url ? describe : describe.skip;

postgres("AppSettings and order expiration on PostgreSQL", () => {
	let admin: DataSource;
	let db: DataSource;
	let settings: AppSettingsService;
	let expiration: OrderCheckoutService;
	let cancellations: OrderExpirationService;
	let writer: AppSettingsService;
	let history: AppSettingsService;
	let versions: AppSettingsService;

	const database = `ams5_test_${randomUUID().replace(/-/g, "")}`;
	const migration = new VersionedAppSettings1793500000000();

	beforeAll(async () => {
		admin = await new DataSource({
			type: "postgres",
			url,
		}).initialize();
		// Создаём изолированную БД для интеграционных тестов настроек.
		await admin.query(`CREATE DATABASE "${database}"`);

		const testUrl = new URL(url);

		testUrl.pathname = `/${database}`;
		db = await new DataSource({
			type: "postgres",
			url: testUrl.toString(),
			entities: [join(__dirname, "../../entities/**/*.entity.ts")],
			extra: { max: 12 },
		}).initialize();
		// Минимальная исходная схема до AMS-5: проверяем настоящую миграцию,
		// а не synchronize, включая существующие legacy-заказы.
		await db.query(
			'CREATE TABLE "user_entity" ("id" integer PRIMARY KEY, "username" varchar, "email" varchar NOT NULL DEFAULT \'admin@example.com\')',
		);
		// Добавляем двух тестовых администраторов для проверки авторства версий.
		await db.query('INSERT INTO "user_entity" VALUES (1), (2)');
		// Создаём схему пользовательских заказов для тестирования окна оплаты.
		await db.query('CREATE SCHEMA "users"');
		// Воссоздаём исходный enum статусов, который расширяется проверяемой миграцией.
		await db.query("CREATE TYPE \"users\".\"user_order_entity_status_enum\" AS ENUM ('open', 'success', 'cancel')");
		// Создаём минимальную таблицу заказов с нулевой ценой, чтобы тестировать сроки оплаты независимо от
		// расчёта стоимости.
		await db.query(`CREATE TABLE "users"."user_order_entity" (
            "id" serial PRIMARY KEY, "state" varchar NOT NULL DEFAULT 'active',
            "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
            "userId" integer, "paymentId" integer, "sourceAdminOrderId" integer,
            -- Фиксированная нулевая цена: этот набор проверяет срок оплаты независимо от AMS-7.
            "subtotalAmount" bigint DEFAULT 0, "discountAmount" bigint DEFAULT 0,
            "totalAmount" bigint DEFAULT 0, "currency" varchar(3) DEFAULT 'RUB',
            "discounts" jsonb DEFAULT '[]', "paidAt" timestamptz,
            -- Текущая модель фиксирует дату checkout; проверка её миграции находится в order.postgres.spec.ts.
            "placed_at" timestamptz,
            "status" "users"."user_order_entity_status_enum" NOT NULL DEFAULT 'open'
        )`);

		const module = await settingsTestModule(db);

		settings = module.get(AppSettingsService);
		expiration = module.get(OrderCheckoutService);
		cancellations = module.get(OrderExpirationService);
		writer = module.get(AppSettingsService);
		history = module.get(AppSettingsService);
		versions = module.get(AppSettingsService);
	}, 30_000);

	beforeEach(async () => {
		// Добавляем старую административную покупку для проверки совместимости миграции.
		await db.query(
			'INSERT INTO "users"."user_order_entity" ("userId", "status", "sourceAdminOrderId") VALUES (1, \'success\', 42)',
		);

		const runner = db.createQueryRunner();

		try {
			await runner.startTransaction();
			await migration.up(runner);
			await runner.commitTransaction();
		} finally {
			await runner.release();
		}
	});

	afterEach(async () => {
		const runner = db.createQueryRunner();

		try {
			await runner.startTransaction();
			await migration.down(runner);
			await runner.commitTransaction();
		} finally {
			await runner.release();
		}
		// Удаляем тестовые заказы перед следующим сценарием.
		await db.query('DELETE FROM "users"."user_order_entity"');
	});

	afterAll(async () => {
		if (db?.isInitialized) {
			await db.destroy();
		}

		if (admin?.isInitialized) {
			// Удаляем изолированную тестовую БД и принудительно закрываем оставшиеся подключения.
			await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
			await admin.destroy();
		}
	});

	/** Создаёт в тестовой БД открытую корзину указанного пользователя и загружает её как сущность. */
	async function openOrder(userId = 1): Promise<UserOrderEntity> {
		// Вставляем открытую корзину указанного пользователя и получаем её идентификатор.
		const [{ id }] = await db.query(
			'INSERT INTO "users"."user_order_entity" ("userId") VALUES ($1) RETURNING "id"',
			[userId],
		);

		return db.getRepository(UserOrderEntity).findOneByOrFail({ id });
	}

	/**
	 * Готовит тестовый заказ к оплате; при expired задаёт уже истёкший срок, иначе запускает штатное
	 * оформление.
	 */
	async function pendingOrder(expired = false): Promise<OrderPlacement> {
		const order = await openOrder();

		if (expired) {
			const { version } = await settings.current();

			// Делаем тестовый заказ ожидающим оплаты с уже истёкшим сроком и выбранной версией настроек.
			await db.query(
				`UPDATE "users"."user_order_entity" SET "status" = 'pending_payment',
                "paymentExpiresAt" = CURRENT_TIMESTAMP - interval '1 second', "appSettingsVersion" = $2 WHERE "id" = $1`,
				[order.id, version],
			);
			return db.getRepository(UserOrderEntity).findOneByOrFail({
				id: order.id,
			});
		}

		return db.transaction((manager) => expiration.startPaymentWindow(order.id, 1, manager));
	}

	it("atomically initializes exactly v1 across multiple instances and repeated starts", async () => {
		const instances = Array.from({ length: 8 }, () => new AppSettingsService(new AppSettingsRepository(db), db));

		await Promise.all(instances
			.map((service) => service.onModuleInit()));
		await Promise.all(instances
			.map((service) => service.onModuleInit()));
		expect(await db.getRepository(AppSettingEntity)
			.find()).toMatchObject([
				{
					version: 1,
					snapshot: {
						orders: { paymentExpirationDays: 7 },
					},
					createdById: null,
				},
			]);
	});

	it("selects max version irrespective of creation time and sees changes without restarting", async () => {
		await db.getRepository(AppSettingEntity).insert([
			{
				version: 1,
				snapshot: {},
				createdAt: new Date("2030-01-01"),
			},
			{
				version: 2,
				snapshot: {
					orders: { paymentExpirationDays: 12 },
				},
				createdAt: new Date("2020-01-01"),
			},
		]);
		await expect(settings.current()).resolves.toMatchObject({ version: 2 });
		await expect(settings.get("orders.paymentExpirationDays")).resolves.toBe(12);
		await writer.createVersion(
			2,
			{
				orders: { paymentExpirationDays: 14 },
			},
			1,
		);
		await expect(settings.get("orders.paymentExpirationDays")).resolves.toBe(14);
	});

	it("paginates all immutable versions by version DESC and returns safe author metadata", async () => {
		await db.getRepository(AppSettingEntity).insert(
			Array.from({ length: 23 }, (_, index) => ({
				version: index + 1,
				snapshot:
					index === 0
						? {}
						: {
							orders: {
								paymentExpirationDays: index + 1,
							},
						},
				createdById: index === 0 ? null : 1,
				createdAt: new Date(Date.UTC(2030 - index, 0, 1)),
			})),
		);

		const page = await history.history(2);

		expect(page).toMatchObject({
			page: 2,
			count: 3,
			total: 23,
			activeVersion: 23,
		});
		expect(page.items
			.map((item) => item.version)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
		expect(page.items[0].createdBy).toEqual({
			id: 1,
			username: null,
			email: "admin@example.com",
		});

		const last = await history.history(3);

		expect(last.items
			.map((item) => item.version)).toEqual([3, 2, 1]);
		await expect(versions.version(1)).resolves.toMatchObject({
			version: 1,
			snapshot: {},
			createdBy: null,
		});
		await expect(versions.version(999)).rejects.toMatchObject({
			status: 400,
			response: { code: "NOT_EXIST" },
		});
		await expect(history.history(4)).resolves.toMatchObject({
			items: [],
			total: 23,
			activeVersion: 23,
		});
	});

	it("supports an empty history and validates page/version bounds", async () => {
		await expect(history.history(1)).resolves.toMatchObject({
			items: [],
			total: 0,
			count: 0,
			activeVersion: null,
		});
		for (const invalid of [0, -1, 1.5, NaN, 2147483648]) {
			await expect(history.history(invalid)).rejects.toMatchObject({ status: 400 });
			await expect(versions.version(invalid)).rejects.toMatchObject({ status: 400 });
		}
	});

	it("serializes competing writes; only one stale editor succeeds and old JSON is untouched", async () => {
		await db.getRepository(AppSettingEntity).insert({
			version: 1,
			snapshot: {
				future: [false, 0],
				orders: { deprecated: true },
			},
		});

		const results = await Promise.allSettled(
			[14, 21]
				.map((paymentExpirationDays) =>
					writer.createVersion(
						1,
						{
							orders: { paymentExpirationDays },
						},
						1,
					),
				),
		);

		expect(results
			.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results
			.find((result) => result.status === "rejected")).toMatchObject({
				reason: {
					status: 409,
					response: {
						code: "VERSION_CONFLICT",
						entity: "appSettings",
					},
				},
			});

		const rows = await db.getRepository(AppSettingEntity)
			.find({
				order: { version: "ASC" },
			});

		expect(rows).toHaveLength(2);
		expect(rows[0].snapshot).toEqual({
			future: [false, 0],
			orders: { deprecated: true },
		});
		expect(rows[1]).toMatchObject({
			version: 2,
			createdById: 1,
			snapshot: {
				future: [false, 0],
				orders: { deprecated: true },
			},
		});
	});

	it("reads defaults from old snapshots and rejects invalid patches without adding versions", async () => {
		await db.getRepository(AppSettingEntity).insert({
			version: 1,
			snapshot: {},
		});
		await expect(settings.getRaw("orders.paymentExpirationDays")).resolves.toBeUndefined();
		await expect(settings.get("orders.paymentExpirationDays")).resolves.toBe(7);
		await expect(
			writer.createVersion(
				1,
				{
					orders: { paymentExpirationDays: 0 },
				},
				1,
			),
		).rejects.toMatchObject({
			status: 400,
		});
		expect(await db.getRepository(AppSettingEntity).count()).toBe(1);
	});

	it("enforces immutability in the database even when bypassing the service", async () => {
		await settings.current();
		// Проверяем, что БД запрещает изменение snapshot сохранённых версий настроек.
		await expect(db.query('UPDATE "app_setting_entity" SET "snapshot" = \'{}\'')).rejects.toThrow("immutable");
		// Проверяем запрет удаления истории версий настроек.
		await expect(db.query('DELETE FROM "app_setting_entity"')).rejects.toThrow("immutable");
		// Проверяем, что TRUNCATE также не обходит защиту неизменяемой истории настроек.
		await expect(db.query('TRUNCATE "app_setting_entity" CASCADE')).rejects.toThrow("immutable");
		await expect(db.getRepository(AppSettingEntity).count()).resolves.toBe(1);
	});

	it("captures 7 days and its version once; later settings affect only new orders", async () => {
		const first = await pendingOrder();

		const firstOrder = await db.getRepository(UserOrderEntity).findOneByOrFail({ id: first.id });

		// Обе даты фиксируются временем БД; проверка не зависит от расхождения часов контейнера и Node.
		expect(first.paymentExpiresAt.valueOf() - firstOrder.placedAt.valueOf()).toBe(7 * 86_400_000);
		expect(first.appSettingsVersion).toBe(1);
		await writer.createVersion(
			1,
			{
				orders: { paymentExpirationDays: 14 },
			},
			1,
		);

		const repeated = await db.transaction((manager) => expiration.startPaymentWindow(first.id, 1, manager));

		expect(repeated.paymentExpiresAt).toEqual(first.paymentExpiresAt);
		expect(repeated.appSettingsVersion).toBe(1);

		const next = await pendingOrder();

		expect(next.appSettingsVersion).toBe(2);
		const nextOrder = await db.getRepository(UserOrderEntity).findOneByOrFail({ id: next.id });

		expect(next.paymentExpiresAt.valueOf() - nextOrder.placedAt.valueOf()).toBe(14 * 86_400_000);
	});

	it("rejects foreign, missing, inactive, completed and administrative orders", async () => {
		const foreign = await openOrder(2);
		const inactive = await openOrder();

		// Делаем заказ неактивным, чтобы проверить его исключение из автоматической отмены.
		await db.query('UPDATE "users"."user_order_entity" SET "state" = \'inactive\' WHERE "id" = $1', [inactive.id]);

		// Находим административную покупку, которая не должна отменяться как обычный просроченный заказ.
		const [administrative] = await db.query(
			'SELECT "id" FROM "users"."user_order_entity" WHERE "sourceAdminOrderId" IS NOT NULL',
		);

		for (const id of [foreign.id, inactive.id, administrative.id, 999999]) {
			await expect(
				db.transaction((manager) => expiration.startPaymentWindow(id, 1, manager)),
			).rejects.toMatchObject({ status: 400 });
		}

		const completed = await openOrder();

		// Переводим выбранный заказ в оплаченный для проверки запрета повторного оформления.
		await db.query('UPDATE "users"."user_order_entity" SET "status" = \'success\' WHERE "id" = $1', [completed.id]);
		await expect(
			db.transaction((manager) => expiration.startPaymentWindow(completed.id, 1, manager)),
		).rejects.toMatchObject({ status: 400 });
		await expect(expiration.startPaymentWindow(completed.id, 1, db.manager)).rejects.toThrow("active transaction");
	});

	it("serializes concurrent payment window creation without extending the first deadline", async () => {
		const order = await openOrder();

		const [first, second] = await Promise.all(
			[1, 2]
				.map(() => db.transaction((manager) => expiration.startPaymentWindow(order.id, 1, manager))),
		);

		expect(first.paymentExpiresAt).toEqual(second.paymentExpiresAt);
		expect(first.appSettingsVersion).toBe(second.appSettingsVersion);
	});

	it("rolls back the payment window with the rest of checkout on failure", async () => {
		const order = await openOrder();

		await expect(
			db.transaction(async (manager) => {
				await expiration.startPaymentWindow(order.id, 1, manager);
				throw new Error("checkout failed");
			}),
		).rejects.toThrow("checkout failed");
		await expect(
			db.getRepository(UserOrderEntity).findOneByOrFail({
				id: order.id,
			}),
		).resolves.toMatchObject({
			status: OrderStatus.OPEN,
			paymentExpiresAt: null,
			appSettingsVersion: null,
		});
	});

	it("cancels only expired active pending orders, idempotently across instances", async () => {
		const expired = await pendingOrder(true);
		const future = await pendingOrder();
		const paid = await pendingOrder(true);

		// Моделируем оплату до запуска автоматической отмены просроченных заказов.
		await db.query('UPDATE "users"."user_order_entity" SET "status" = \'success\' WHERE "id" = $1', [paid.id]);

		const cart = await openOrder();
		const counts = await Promise.all([cancellations.cancelExpiredOrders(), cancellations.cancelExpiredOrders()]);

		expect(counts
			.reduce((a, b) => a + b, 0)).toBe(1);
		await expect(cancellations.cancelExpiredOrders()).resolves.toBe(0);
		await expect(
			db.getRepository(UserOrderEntity).findOneByOrFail({
				id: expired.id,
			}),
		).resolves.toMatchObject({
			status: OrderStatus.CANCELLED,
			cancelReason: PAYMENT_EXPIRED_REASON,
			cancelledAt: expect.any(Date),
		});

		const remaining = await db.getRepository(UserOrderEntity).findBy([
			{
				id: future.id,
			},
			{
				id: paid.id,
			},
			{
				id: cart.id,
			},
		]);

		expect(remaining
			.map((order) => order.status)
			.sort()).toEqual(
				[OrderStatus.OPEN, OrderStatus.PENDING_PAYMENT, OrderStatus.PAID]
					.sort(),
			);

		// Читаем старую покупку из административного источника для проверки сохранности после миграции.
		const [legacy] = await db.query('SELECT * FROM "users"."user_order_entity" WHERE "sourceAdminOrderId" = 42');

		expect(legacy).toMatchObject({
			status: "success",
			paymentExpiresAt: null,
			appSettingsVersion: null,
		});
	});

	it("rechecks pending status after waiting for an active payment transaction", async () => {
		const order = await pendingOrder(true);
		const payment = db.createQueryRunner();

		await payment.startTransaction();
		let cancellation: Promise<number>;
		try {
			// В транзакции оплаты удерживаем блокировку строки заказа, чтобы воспроизвести конкуренцию с
			// отменой.
			await payment.query('SELECT "id" FROM "users"."user_order_entity" WHERE "id" = $1 FOR UPDATE', [order.id]);
			cancellation = cancellations.cancelExpiredOrders();

			const deadline = Date.now() + 3000;

			let blocked = false;
			while (Date.now() < deadline) {
				// Проверяем через pg_stat_activity, что обновление заказа действительно ожидает блокировку в
				// текущей БД.
				const [{ waiting }] = await db.query(`SELECT EXISTS (SELECT 1 FROM pg_stat_activity
                    WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'UPDATE%user_order_entity%') AS waiting`);

				if (waiting) {
					blocked = true;
					break;
				}

				await new Promise((resolve) => setImmediate(resolve));
			}
			expect(blocked).toBe(true);
			// Завершаем оплату только ожидающего заказа под удерживаемой блокировкой перед разблокированием
			// отмены.
			await payment.query(
				'UPDATE "users"."user_order_entity" SET "status" = \'success\' WHERE "id" = $1 AND "status" = \'pending_payment\'',
				[order.id],
			);
			await payment.commitTransaction();
			await expect(cancellation).resolves.toBe(0);
		} finally {
			if (payment.isTransactionActive) {
				await payment.rollbackTransaction();
			}

			await payment.release();

			if (cancellation) {
				await cancellation;
			}
		}
		await expect(
			db.getRepository(UserOrderEntity).findOneByOrFail({
				id: order.id,
			}),
		).resolves.toMatchObject({
			status: OrderStatus.PAID,
		});
	});

	it("does not reopen an expired order on a late conditional payment transition", async () => {
		const order = await pendingOrder(true);

		await cancellations.cancelExpiredOrders();

		const result = await db.getRepository(UserOrderEntity).update(
			{
				id: order.id,
				status: OrderStatus.PENDING_PAYMENT,
			},
			{
				status: OrderStatus.PAID,
			},
		);

		expect(result.affected).toBe(0);
		// Даже ошибочный безусловный save из запоздавшего webhook не воскресит заказ.
		await expect(
			db.getRepository(UserOrderEntity).update(order.id, {
				status: OrderStatus.PAID,
			}),
		).rejects.toThrow("Cannot reopen");
	});

	it("rejects rewriting a fixed payment window and reopening a pending order at database level", async () => {
		const order = await pendingOrder();

		await writer.createVersion(
			1,
			{
				orders: { paymentExpirationDays: 14 },
			},
			1,
		);
		await expect(
			db.getRepository(UserOrderEntity).update(order.id, {
				paymentExpiresAt: new Date(),
			}),
		).rejects.toThrow("immutable");
		await expect(db.getRepository(UserOrderEntity).update(order.id, { appSettingsVersion: 2 })).rejects.toThrow(
			"immutable",
		);
		await expect(
			db.getRepository(UserOrderEntity).update(order.id, {
				status: OrderStatus.OPEN,
			}),
		).rejects.toThrow("Cannot reopen");
	});
});
