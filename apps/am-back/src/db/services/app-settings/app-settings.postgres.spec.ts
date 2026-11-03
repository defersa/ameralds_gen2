import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { VersionedAppSettings1793500000000 } from '../../../../database/migrations/1793500000000-versioned-app-settings';
import { DataSourceService } from '../../data-source.service';
import { AppSettingEntity } from '../../entities/app-setting.entity';
import { OrderStatus, UserOrderEntity } from '../../entities/purchases/order.entity';
import { OrderExpirationService, PAYMENT_EXPIRED_REASON } from '../order/order-expiration.service';
import { AppSettingsService } from './app-settings.service';

// URL PostgreSQL с правом CREATE DATABASE. Создаётся и удаляется только собственная
// случайно названная БД; данные исходной БД не изменяются. Пример запуска — в README.
const url = process.env.APP_SETTINGS_TEST_DATABASE_URL;
const postgres = url ? describe : describe.skip;

postgres('AppSettings and order expiration on PostgreSQL', () => {
    let admin: DataSource;
    let db: DataSource;
    let settings: AppSettingsService;
    let expiration: OrderExpirationService;
    const database = `ams5_test_${randomUUID().replace(/-/g, '')}`;
    const migration = new VersionedAppSettings1793500000000();

    beforeAll(async () => {
        admin = await new DataSource({ type: 'postgres', url }).initialize();
        await admin.query(`CREATE DATABASE "${database}"`);
        const testUrl = new URL(url);
        testUrl.pathname = `/${database}`;
        db = await new DataSource({
            type: 'postgres', url: testUrl.toString(),
            entities: [join(__dirname, '../../entities/**/*.entity.ts')],
            extra: { max: 12 },
        }).initialize();
        // Минимальная исходная схема до AMS-5: проверяем настоящую миграцию,
        // а не synchronize, включая существующие legacy-заказы.
        await db.query('CREATE TABLE "user_entity" ("id" integer PRIMARY KEY, "username" varchar, "email" varchar NOT NULL DEFAULT \'admin@example.com\')');
        await db.query('INSERT INTO "user_entity" VALUES (1), (2)');
        await db.query('CREATE SCHEMA "users"');
        await db.query('CREATE TYPE "users"."user_order_entity_status_enum" AS ENUM (\'open\', \'success\', \'cancel\')');
        await db.query(`CREATE TABLE "users"."user_order_entity" (
            "id" serial PRIMARY KEY, "state" varchar NOT NULL DEFAULT 'active',
            "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
            "userId" integer, "paymentId" integer, "sourceAdminOrderId" integer,
            "status" "users"."user_order_entity_status_enum" NOT NULL DEFAULT 'open'
        )`);
        const source = new DataSourceService(db);
        settings = new AppSettingsService(source);
        expiration = new OrderExpirationService(source, settings);
    }, 30_000);

    beforeEach(async () => {
        await db.query('INSERT INTO "users"."user_order_entity" ("userId", "status", "sourceAdminOrderId") VALUES (1, \'success\', 42)');
        const runner = db.createQueryRunner();
        try {
            await runner.startTransaction();
            await migration.up(runner);
            await runner.commitTransaction();
        } finally { await runner.release(); }
    });

    afterEach(async () => {
        const runner = db.createQueryRunner();
        try {
            await runner.startTransaction();
            await migration.down(runner);
            await runner.commitTransaction();
        } finally { await runner.release(); }
        await db.query('DELETE FROM "users"."user_order_entity"');
    });

    afterAll(async () => {
        if (db?.isInitialized) await db.destroy();
        if (admin?.isInitialized) {
            await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
            await admin.destroy();
        }
    });

    async function openOrder(userId = 1): Promise<UserOrderEntity> {
        const [{ id }] = await db.query('INSERT INTO "users"."user_order_entity" ("userId") VALUES ($1) RETURNING "id"', [userId]);
        return db.getRepository(UserOrderEntity).findOneByOrFail({ id });
    }

    async function pendingOrder(expired = false): Promise<UserOrderEntity> {
        const order = await openOrder();
        if (expired) {
            const { version } = await settings.current();
            await db.query(`UPDATE "users"."user_order_entity" SET "status" = 'pending_payment',
                "paymentExpiresAt" = CURRENT_TIMESTAMP - interval '1 second', "appSettingsVersion" = $2 WHERE "id" = $1`, [order.id, version]);
            return db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id });
        }
        return db.transaction(manager => expiration.startPaymentWindow(order.id, 1, manager));
    }

    it('atomically initializes exactly v1 across multiple instances and repeated starts', async () => {
        const instances = Array.from({ length: 8 }, () => new AppSettingsService(new DataSourceService(db)));
        await Promise.all(instances.map(service => service.onModuleInit()));
        await Promise.all(instances.map(service => service.onModuleInit()));
        expect(await db.getRepository(AppSettingEntity).find()).toMatchObject([
            { version: 1, snapshot: { orders: { paymentExpirationDays: 7 } }, createdById: null },
        ]);
    });

    it('selects max version irrespective of creation time and sees changes without restarting', async () => {
        await db.getRepository(AppSettingEntity).insert([
            { version: 1, snapshot: {}, createdAt: new Date('2030-01-01') },
            { version: 2, snapshot: { orders: { paymentExpirationDays: 12 } }, createdAt: new Date('2020-01-01') },
        ]);
        await expect(settings.current()).resolves.toMatchObject({ version: 2 });
        await expect(settings.get('orders.paymentExpirationDays')).resolves.toBe(12);
        await settings.createVersion(2, { orders: { paymentExpirationDays: 14 } }, 1);
        await expect(settings.get('orders.paymentExpirationDays')).resolves.toBe(14);
    });

    it('paginates all immutable versions by version DESC and returns safe author metadata', async () => {
        await db.getRepository(AppSettingEntity).insert(Array.from({ length: 23 }, (_, index) => ({
            version: index + 1, snapshot: index === 0 ? {} : { orders: { paymentExpirationDays: index + 1 } },
            createdById: index === 0 ? null : 1,
            createdAt: new Date(Date.UTC(2030 - index, 0, 1)),
        })));
        const page = await settings.history(2);
        expect(page).toMatchObject({ page: 2, count: 3, total: 23, activeVersion: 23 });
        expect(page.items.map(item => item.version)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
        expect(page.items[0].createdBy).toEqual({ id: 1, username: null, email: 'admin@example.com' });
        const last = await settings.history(3);
        expect(last.items.map(item => item.version)).toEqual([3, 2, 1]);
        await expect(settings.version(1)).resolves.toMatchObject({ version: 1, snapshot: {}, createdBy: null });
        await expect(settings.version(999)).rejects.toMatchObject({ status: 400, response: { code: 'NOT_EXIST' } });
        await expect(settings.history(4)).resolves.toMatchObject({ items: [], total: 23, activeVersion: 23 });
    });

    it('supports an empty history and validates page/version bounds', async () => {
        await expect(settings.history(1)).resolves.toMatchObject({ items: [], total: 0, count: 0, activeVersion: null });
        for (const invalid of [0, -1, 1.5, NaN, 2147483648]) {
            await expect(settings.history(invalid)).rejects.toMatchObject({ status: 400 });
            await expect(settings.version(invalid)).rejects.toMatchObject({ status: 400 });
        }
    });

    it('serializes competing writes; only one stale editor succeeds and old JSON is untouched', async () => {
        await db.getRepository(AppSettingEntity).insert({ version: 1, snapshot: { future: [false, 0], orders: { deprecated: true } } });
        const results = await Promise.allSettled([14, 21].map(paymentExpirationDays =>
            settings.createVersion(1, { orders: { paymentExpirationDays } }, 1)));
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.find(result => result.status === 'rejected')).toMatchObject({
            reason: { status: 409, response: { code: 'VERSION_CONFLICT', entity: 'appSettings' } },
        });
        const rows = await db.getRepository(AppSettingEntity).find({ order: { version: 'ASC' } });
        expect(rows).toHaveLength(2);
        expect(rows[0].snapshot).toEqual({ future: [false, 0], orders: { deprecated: true } });
        expect(rows[1]).toMatchObject({ version: 2, createdById: 1, snapshot: { future: [false, 0], orders: { deprecated: true } } });
    });

    it('reads defaults from old snapshots and rejects invalid patches without adding versions', async () => {
        await db.getRepository(AppSettingEntity).insert({ version: 1, snapshot: {} });
        await expect(settings.getRaw('orders.paymentExpirationDays')).resolves.toBeUndefined();
        await expect(settings.get('orders.paymentExpirationDays')).resolves.toBe(7);
        await expect(settings.createVersion(1, { orders: { paymentExpirationDays: 0 } }, 1)).rejects.toMatchObject({ status: 400 });
        expect(await db.getRepository(AppSettingEntity).count()).toBe(1);
    });

    it('enforces immutability in the database even when bypassing the service', async () => {
        await settings.current();
        await expect(db.query('UPDATE "app_setting_entity" SET "snapshot" = \'{}\'')).rejects.toThrow('immutable');
        await expect(db.query('DELETE FROM "app_setting_entity"')).rejects.toThrow('immutable');
        await expect(db.query('TRUNCATE "app_setting_entity" CASCADE')).rejects.toThrow('immutable');
        await expect(db.getRepository(AppSettingEntity).count()).resolves.toBe(1);
    });

    it('captures 7 days and its version once; later settings affect only new orders', async () => {
        const first = await pendingOrder();
        expect(first.paymentExpiresAt.valueOf() - Date.now()).toBeGreaterThan(7 * 86_400_000 - 3000);
        expect(first.paymentExpiresAt.valueOf() - Date.now()).toBeLessThanOrEqual(7 * 86_400_000);
        expect(first.appSettingsVersion).toBe(1);
        await settings.createVersion(1, { orders: { paymentExpirationDays: 14 } }, 1);
        const repeated = await db.transaction(manager => expiration.startPaymentWindow(first.id, 1, manager));
        expect(repeated.paymentExpiresAt).toEqual(first.paymentExpiresAt);
        expect(repeated.appSettingsVersion).toBe(1);
        const next = await pendingOrder();
        expect(next.appSettingsVersion).toBe(2);
        expect(next.paymentExpiresAt.valueOf() - Date.now()).toBeGreaterThan(14 * 86_400_000 - 3000);
    });

    it('rejects foreign, missing, inactive, completed and administrative orders', async () => {
        const foreign = await openOrder(2);
        const inactive = await openOrder();
        await db.query('UPDATE "users"."user_order_entity" SET "state" = \'inactive\' WHERE "id" = $1', [inactive.id]);
        const [administrative] = await db.query('SELECT "id" FROM "users"."user_order_entity" WHERE "sourceAdminOrderId" IS NOT NULL');
        for (const id of [foreign.id, inactive.id, administrative.id, 999999]) {
            await expect(db.transaction(manager => expiration.startPaymentWindow(id, 1, manager))).rejects.toMatchObject({ status: 400 });
        }
        const completed = await openOrder();
        await db.query('UPDATE "users"."user_order_entity" SET "status" = \'success\' WHERE "id" = $1', [completed.id]);
        await expect(db.transaction(manager => expiration.startPaymentWindow(completed.id, 1, manager))).rejects.toMatchObject({ status: 400 });
        await expect(expiration.startPaymentWindow(completed.id, 1, db.manager)).rejects.toThrow('active transaction');
    });

    it('serializes concurrent payment window creation without extending the first deadline', async () => {
        const order = await openOrder();
        const [first, second] = await Promise.all([1, 2].map(() =>
            db.transaction(manager => expiration.startPaymentWindow(order.id, 1, manager))));
        expect(first.paymentExpiresAt).toEqual(second.paymentExpiresAt);
        expect(first.appSettingsVersion).toBe(second.appSettingsVersion);
    });

    it('rolls back the payment window with the rest of checkout on failure', async () => {
        const order = await openOrder();
        await expect(db.transaction(async manager => {
            await expiration.startPaymentWindow(order.id, 1, manager);
            throw new Error('checkout failed');
        })).rejects.toThrow('checkout failed');
        await expect(db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).resolves.toMatchObject({
            status: OrderStatus.OPEN, paymentExpiresAt: null, appSettingsVersion: null,
        });
    });

    it('cancels only expired active pending orders, idempotently across instances', async () => {
        const expired = await pendingOrder(true);
        const future = await pendingOrder();
        const paid = await pendingOrder(true);
        await db.query('UPDATE "users"."user_order_entity" SET "status" = \'success\' WHERE "id" = $1', [paid.id]);
        const cart = await openOrder();
        const counts = await Promise.all([expiration.cancelExpiredOrders(), expiration.cancelExpiredOrders()]);
        expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
        await expect(expiration.cancelExpiredOrders()).resolves.toBe(0);
        await expect(db.getRepository(UserOrderEntity).findOneByOrFail({ id: expired.id })).resolves.toMatchObject({
            status: OrderStatus.CANCEL, cancelReason: PAYMENT_EXPIRED_REASON, cancelledAt: expect.any(Date),
        });
        const remaining = await db.getRepository(UserOrderEntity).findBy([{ id: future.id }, { id: paid.id }, { id: cart.id }]);
        expect(remaining.map(order => order.status).sort()).toEqual([OrderStatus.OPEN, OrderStatus.PENDING_PAYMENT, OrderStatus.SUCCESS].sort());
        const [legacy] = await db.query('SELECT * FROM "users"."user_order_entity" WHERE "sourceAdminOrderId" = 42');
        expect(legacy).toMatchObject({ status: 'success', paymentExpiresAt: null, appSettingsVersion: null });
    });

    it('rechecks pending status after waiting for an active payment transaction', async () => {
        const order = await pendingOrder(true);
        const payment = db.createQueryRunner();
        await payment.startTransaction();
        let cancellation: Promise<number>;
        try {
            await payment.query('SELECT "id" FROM "users"."user_order_entity" WHERE "id" = $1 FOR UPDATE', [order.id]);
            cancellation = expiration.cancelExpiredOrders();
            const deadline = Date.now() + 3000;
            let blocked = false;
            while (Date.now() < deadline) {
                const [{ waiting }] = await db.query(`SELECT EXISTS (SELECT 1 FROM pg_stat_activity
                    WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'UPDATE%user_order_entity%') AS waiting`);
                if (waiting) { blocked = true; break; }
                await new Promise(resolve => setImmediate(resolve));
            }
            expect(blocked).toBe(true);
            await payment.query('UPDATE "users"."user_order_entity" SET "status" = \'success\' WHERE "id" = $1 AND "status" = \'pending_payment\'', [order.id]);
            await payment.commitTransaction();
            await expect(cancellation).resolves.toBe(0);
        } finally {
            if (payment.isTransactionActive) await payment.rollbackTransaction();
            await payment.release();
            if (cancellation) await cancellation;
        }
        await expect(db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).resolves.toMatchObject({ status: OrderStatus.SUCCESS });
    });

    it('does not reopen an expired order on a late conditional payment transition', async () => {
        const order = await pendingOrder(true);
        await expiration.cancelExpiredOrders();
        const result = await db.getRepository(UserOrderEntity).update({ id: order.id, status: OrderStatus.PENDING_PAYMENT }, { status: OrderStatus.SUCCESS });
        expect(result.affected).toBe(0);
        // Даже ошибочный безусловный save из запоздавшего webhook не воскресит заказ.
        await expect(db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.SUCCESS })).rejects.toThrow('Cannot reopen');
    });

    it('rejects rewriting a fixed payment window and reopening a pending order at database level', async () => {
        const order = await pendingOrder();
        await settings.createVersion(1, { orders: { paymentExpirationDays: 14 } }, 1);
        await expect(db.getRepository(UserOrderEntity).update(order.id, { paymentExpiresAt: new Date() })).rejects.toThrow('immutable');
        await expect(db.getRepository(UserOrderEntity).update(order.id, { appSettingsVersion: 2 })).rejects.toThrow('immutable');
        await expect(db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.OPEN })).rejects.toThrow('Cannot reopen');
    });
});
