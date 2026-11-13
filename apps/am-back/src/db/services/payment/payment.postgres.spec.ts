import { ModelState } from '@am-back/db/abstract/abstract.model';
import { AppSettingEntity } from '@am-back/db/entities/app-setting.entity';
import { NumberLangEntity } from '@am-back/db/entities/common/number-lang.entity';
import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import { UserEntity } from '@am-back/db/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, IsNull } from 'typeorm';
import { PaymentAttempts1794000000000 } from '../../../../database/migrations/1794000000000-payment-attempts';
import { UserOrderRepository } from '../order/repositories/user-order.repository';
import { PaymentService } from './payment.service';
import { PaymentCompletionService } from './payment-completion.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentRepository } from './repositories/payment.repository';
import { PAYMENT_PROVIDER, ProviderPaymentStatus } from './types/payment-provider';


const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;
const postgres = databaseUrl ? describe : describe.skip;

postgres('payment migration, idempotency and concurrency on PostgreSQL', () => {
    const database = `ams10_test_${randomUUID().replace(/-/g, '')}`;
    const migration = new PaymentAttempts1794000000000();
    let admin: DataSource;
    let db: DataSource;
    let module: TestingModule;
    let service: PaymentService;
    let provider: MockPaymentProvider;
    let payments: PaymentRepository;
    let user: UserEntity;
    let order: UserOrderEntity;
    let legacyOrderId: number;
    let legacyPaymentId: number;
    let legacyPriceId: number;

    beforeAll(async () => {
        admin = await new DataSource({
            type: 'postgres',
            url: databaseUrl,
        }).initialize();
        // Создаём случайную отдельную БД; исходная БД подключения не изменяется.
        await admin.query(`CREATE DATABASE "${database}"`);

        const url = new URL(databaseUrl);

        url.pathname = `/${database}`;
        db = await new DataSource({
            type: 'postgres',
            url: url.toString(),
            entities: [join(__dirname, '../../entities/**/*.entity.ts')],
            extra: { max: 12 },
        }).initialize();
        // Явно создаём схемы сущностей в новой пустой тестовой БД до synchronize.
        await db.query('CREATE SCHEMA users; CREATE SCHEMA patterns');
        await db.synchronize();
        await db.transaction((manager) => migration.down(manager.queryRunner));

        const buyer = await db.getRepository(UserEntity).save({ email: 'legacy-payment@example.test' });
        const historical = await db.getRepository(UserOrderEntity).save({
            user: buyer,
            status: OrderStatus.PAID,
        });
        const price = await db.getRepository(NumberLangEntity).save({
            ru: 123.45,
            en: 3.25,
        });

        legacyOrderId = historical.id;
        legacyPriceId = price.id;
        // Формируем legacy OneToOne-платёж с неизвестной валютой, а также платёж без заказа для проверки аудита.
        const [legacy] = await db.query(
            `INSERT INTO "users"."user_payment_entity" ("totalPriceId") VALUES ($1) RETURNING "id"`,
            [price.id],
        );

        legacyPaymentId = legacy.id;
        // Связь до AMS-10 находится на стороне заказа.
        await db.query('UPDATE "users"."user_order_entity" SET "paymentId" = $1 WHERE "id" = $2', [
            legacy.id,
            historical.id,
        ]);
        // Сохраняем также не привязанную историческую запись без выдуманного владельца.
        await db.query('INSERT INTO "users"."user_payment_entity" DEFAULT VALUES');
        await db.transaction((manager) => migration.up(manager.queryRunner));
        await db.getRepository(AppSettingEntity).save({
            version: 1,
            snapshot: {},
        });
    }, 30_000);

    beforeEach(async () => {
        const config = new ConfigService({
            NODE_ENV: 'test',
            SITE_URL: 'https://shop.example.test',
        });

        provider = new MockPaymentProvider(config);
        module = await Test.createTestingModule({
            providers: [
                PaymentService,
                { provide: PaymentCompletionService, useValue: { completeOrder: jest.fn() } },
                PaymentRepository,
                UserOrderRepository,
                {
                    provide: DataSource,
                    useValue: db,
                },
                {
                    provide: PAYMENT_PROVIDER,
                    useValue: provider,
                },
                {
                    provide: ConfigService,
                    useValue: config,
                },
            ],
        }).compile();
        service = module.get(PaymentService);
        payments = module.get(PaymentRepository);
        user = await db.getRepository(UserEntity).save({ email: `${randomUUID()}@example.test` });
        order = await pendingOrder(user);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await module?.close();
    });

    afterAll(async () => {
        if (db?.isInitialized) {
            await db.destroy();
        }

        if (admin?.isInitialized) {
            // Удаляем только случайную тестовую БД и её подключения.
            await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
            await admin.destroy();
        }
    });

    it('migrates legacy links and orphaned rows without inventing money or payment success, and round-trips down/up', async () => {
        const historical = await payments.findOneOrFail({
            where: { id: legacyPaymentId },
            relations: { totalPrice: true },
        });

        expect(historical).toMatchObject({
            orderId: legacyOrderId,
            provider: 'legacy',
            amount: null,
            currency: null,
            status: null,
            totalPrice: {
                id: legacyPriceId,
                ru: '123.45',
            },
        });
        expect(
            await payments.countBy({
                provider: 'legacy',
                orderId: IsNull(),
            }),
        ).toBeGreaterThanOrEqual(1);
        await db.transaction((manager) => migration.down(manager.queryRunner));
        // Проверяем, что откат восстановил прежнюю OneToOne-ссылку, сохранив исходную запись платежа.
        const [restored] = await db.query('SELECT "paymentId" FROM "users"."user_order_entity" WHERE "id" = $1', [
            legacyOrderId,
        ]);

        expect(restored.paymentId).toBe(legacyPaymentId);
        await db.transaction((manager) => migration.up(manager.queryRunner));

        const current = await db.getRepository(UserOrderEntity).findOneOrFail({
            where: { id: legacyOrderId },
            relations: { payments: true },
        });

        expect(current.status).toBe(OrderStatus.PAID);
        expect(current.payments[0].id).toBe(legacyPaymentId);
    });

    it('serializes simultaneous requests with the same and different client keys into one external attempt', async () => {
        provider.enqueueScenario({ delayMs: 50 });

        const key = randomUUID();
        const results = await Promise.all(
            Array.from({ length: 8 }, (_value, index) =>
                service.createPayment(user.id, order.id, index < 4 ? key : randomUUID()),
            ),
        );
        const ids = new Set(results
            .map((result) => result.id));

        expect(ids.size).toBe(1);
        expect(await payments.countBy({ orderId: order.id })).toBe(1);

        const stored = await payments.findOneByOrFail({ orderId: order.id });

        expect(stored.externalId).toMatch(/^mock_/);
        expect(stored.amount).toBe(12345);
    });

    it.each([ProviderPaymentStatus.FAILED, ProviderPaymentStatus.CANCELLED])(
        'keeps all attempts and retries only with a new key after %s',
        async (status) => {
            provider.enqueueScenario({ status });

            const key = randomUUID();
            const first = await service.createPayment(user.id, order.id, key);
            const repeated = await service.createPayment(user.id, order.id, key);
            const next = await service.createPayment(user.id, order.id, randomUUID());

            expect(repeated).toEqual(first);
            expect(next.id).not.toBe(first.id);
            expect(await payments.countBy({ orderId: order.id })).toBe(2);
        },
    );

    it('remembers different client keys bound to the same active payment after it is cancelled', async () => {
        const firstKey = randomUUID();
        const secondKey = randomUUID();
        const first = await service.createPayment(user.id, order.id, firstKey);

        await expect(service.createPayment(user.id, order.id, secondKey)).resolves.toMatchObject({ id: first.id });

        const stored = await payments.findOneByOrFail({ id: first.id });

        await provider.cancelPayment(stored.externalId);
        await expect(service.createPayment(user.id, order.id, firstKey)).resolves.toMatchObject({
            id: first.id,
            status: 'CANCELLED',
        });
        await expect(service.createPayment(user.id, order.id, secondKey)).resolves.toMatchObject({
            id: first.id,
            status: 'CANCELLED',
        });
        expect(await payments.countBy({ orderId: order.id })).toBe(1);
    });

    it('rejects concurrent reuse of a global client key for different owners/orders without leaking database errors', async () => {
        const another = await db.getRepository(UserEntity).save({ email: `${randomUUID()}@example.test` });
        const anotherOrder = await pendingOrder(another);
        const key = randomUUID();

        const results = await Promise.allSettled([
            service.createPayment(user.id, order.id, key),
            service.createPayment(another.id, anotherOrder.id, key),
        ]);

        expect(results
            .filter((result) => result.status === 'fulfilled')).toHaveLength(1);

        const rejected = results
            .find((result) => result.status === 'rejected');

        expect(rejected).toMatchObject({
            reason: {
                status: 409,
                response: { code: 'PAYMENT_CONFLICT' },
            },
        });
        expect(await payments.countBy({ idempotencyKey: key })).toBe(1);
    });

    it('recovers after a provider timeout and a simulated application restart without a duplicate reservation', async () => {
        provider.enqueueScenario({ timeoutAfterCreate: true });

        const key = randomUUID();

        await expect(service.createPayment(user.id, order.id, key)).rejects.toMatchObject({ status: 503 });

        const reserved = await payments.findOneByOrFail({ orderId: order.id });

        expect(reserved).toMatchObject({
            externalId: null,
            status: PaymentStatus.PENDING,
            idempotencyKey: key,
        });

        const restarted = new PaymentService(
            db,
            module.get(UserOrderRepository),
            payments,
            provider,
            new ConfigService({
                NODE_ENV: 'test',
                SITE_URL: 'https://shop.example.test',
            }),
            module.get(PaymentCompletionService),
        );
        const retried = await restarted.createPayment(user.id, order.id, key);

        expect(retried.id).toBe(reserved.id);
        expect(await payments.countBy({ orderId: order.id })).toBe(1);
    });

    it('preserves external idempotency if saving the provider result fails', async () => {
        const save = jest.spyOn(payments, 'saveResult').mockRejectedValueOnce(new Error('DB result commit failed'));
        const key = randomUUID();
        const create = jest.spyOn(provider, 'createPayment');

        await expect(service.createPayment(user.id, order.id, key)).rejects.toThrow('DB result commit failed');
        await expect(service.createPayment(user.id, order.id, key)).resolves.toMatchObject({ status: 'PENDING' });
        expect(create.mock.calls[1][0].idempotencyKey).toBe(create.mock.calls[0][0].idempotencyKey);
        expect(save).toHaveBeenCalledTimes(2);
        expect(await payments.countBy({ orderId: order.id })).toBe(1);
    });

    it('rolls back a failed reservation before contacting the provider', async () => {
        const reserve = payments.reserve.bind(payments);
        const create = jest.spyOn(provider, 'createPayment');

        jest.spyOn(payments, 'reserve').mockImplementationOnce(async (...args) => {
            await reserve(...args);

            throw new Error('Reservation commit failed');
        });

        await expect(service.createPayment(user.id, order.id, randomUUID())).rejects.toThrow(
            'Reservation commit failed',
        );
        expect(create).not.toHaveBeenCalled();
        expect(await payments.countBy({ orderId: order.id })).toBe(0);
    });

    it('does not create a second payment after capture while order completion is pending', async () => {
        provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED });

        const result = await service.createPayment(user.id, order.id, randomUUID());

        expect(result.status).toBe(PaymentStatus.SUCCEEDED);
        expect(result.paidAt).toBeInstanceOf(Date);
        await expect(service.createPayment(user.id, order.id, randomUUID())).rejects.toMatchObject({ status: 409 });

        const unchanged = await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id });

        expect(unchanged.status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(unchanged.paidAt).toBeNull();
    });

    it('keeps captured money in the audit when the order is cancelled during the provider call', async () => {
        provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED });

        const create = provider.createPayment.bind(provider);

        jest.spyOn(provider, 'createPayment').mockImplementationOnce(async (input) => {
            // Воспроизводим независимую транзакцию отмены во время внешнего запроса, без удержания DB-lock.
            await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.CANCELLED });

            return create(input);
        });

        await expect(service.createPayment(user.id, order.id, randomUUID())).rejects.toMatchObject({ status: 400 });
        expect(await payments.findOneByOrFail({ orderId: order.id })).toMatchObject({
            status: PaymentStatus.SUCCEEDED,
        });
        expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).status).toBe(
            OrderStatus.CANCELLED,
        );
    });

    it('enforces partial uniqueness, server money bounds and immutable terminal snapshots in PostgreSQL', async () => {
        const result = await service.createPayment(user.id, order.id, randomUUID());
        const pending = await payments.findOneByOrFail({ id: result.id });

        await expect(
            payments.save({
                orderId: order.id,
                provider: 'mock',
                idempotencyKey: randomUUID(),
                status: PaymentStatus.PENDING,
                amount: 12345,
                currency: 'RUB',
            }),
        ).rejects.toMatchObject({
            driverError: { code: '23505' },
        });
        await expect(payments.update(pending.id, { amount: 1 })).rejects.toThrow('immutable');
        await expect(
            payments.save({
                orderId: order.id,
                provider: 'mock',
                idempotencyKey: randomUUID(),
                status: PaymentStatus.FAILED,
                amount: 9007199254740992,
                currency: 'RUB',
            }),
        ).rejects.toMatchObject({
            driverError: { code: '23514' },
        });
        await payments.update(pending.id, { status: PaymentStatus.FAILED });
        await expect(payments.update(pending.id, { status: PaymentStatus.PENDING })).rejects.toThrow('immutable');

        const second = await pendingOrder(user);

        await expect(
            payments.save({
                orderId: second.id,
                provider: 'mock',
                idempotencyKey: randomUUID(),
                externalId: pending.externalId,
                status: PaymentStatus.FAILED,
                amount: 12345,
                currency: 'RUB',
            }),
        ).rejects.toMatchObject({
            driverError: { code: '23505' },
        });
        await expect(db.transaction((manager) => migration.down(manager.queryRunner))).rejects.toThrow(
            'Cannot discard',
        );
        expect(await payments.findOneByOrFail({ id: pending.id })).toBeDefined();
    });

    it('rejects foreign, inactive and expired orders before creating a payment', async () => {
        const stranger = await db.getRepository(UserEntity).save({ email: `${randomUUID()}@example.test` });

        await expect(service.createPayment(stranger.id, order.id, randomUUID())).rejects.toMatchObject({
            response: { code: 'NOT_EXIST' },
        });
        await db.getRepository(UserOrderEntity).update(order.id, { state: ModelState.INACTIVE });
        await expect(service.createPayment(user.id, order.id, randomUUID())).rejects.toMatchObject({
            response: { code: 'NOT_EXIST' },
        });
        await db.getRepository(UserOrderEntity).update(order.id, {
            state: ModelState.ACTIVE,
            paymentExpiresAt: new Date(0),
        });
        await expect(service.createPayment(user.id, order.id, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        expect(await payments.countBy({ orderId: order.id })).toBe(0);
    });

    /** Создаёт оформленный заказ с серверной суммой и действующим сроком в отдельной тестовой БД. */
    async function pendingOrder(owner: UserEntity): Promise<UserOrderEntity> {
        return db.getRepository(UserOrderEntity).save({
            user: owner,
            status: OrderStatus.PENDING_PAYMENT,
            placedAt: new Date(),
            subtotalAmount: 12345,
            totalAmount: 12345,
            currency: 'RUB',
            paymentExpiresAt: new Date(Date.now() + 60_000),
            appSettingsVersion: 1,
        });
    }
});
