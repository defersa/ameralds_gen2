import { AppSettingEntity } from '@am-back/db/entities/app-setting.entity';
import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { SizeEntity } from '@am-back/db/entities/patterns/size.entity';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentEffectEntity } from '@am-back/db/entities/purchases/payment-effect.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { UserEntity } from '@am-back/db/entities/user.entity';
import { PatternGrantsService } from '@am-back/db/service/pattern-grants/pattern-grants.service';
import { PatternGrantRepository } from '@am-back/db/service/pattern-grants/repositories/pattern-grant.repository';
import { UserPatternRepository } from '@am-back/db/service/pattern-grants/repositories/user-pattern.repository';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { PaymentAttempts1794000000000 } from '../../../../database/migrations/1794000000000-payment-attempts';
import { PaymentCompletion1794500000000 } from '../../../../database/migrations/1794500000000-payment-completion';
import { PaymentTerminalTime1794600000000 } from '../../../../database/migrations/1794600000000-payment-terminal-time';
import { UserOrderRepository } from '../order/repositories/user-order.repository';
import { PaymentCompletionService } from './payment-completion.service';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentEffectsService } from './payment-effects.service';
import { PaymentService } from './payment.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentCompletionRepository } from './repositories/payment-completion.repository';
import { PaymentEffectRepository } from './repositories/payment-effect.repository';
import { PAYMENT_PROVIDER, ProviderPaymentStatus } from './types/payment-provider';
import { MailService } from '@am-back/mail/mail.service';


const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;
const postgres = databaseUrl ? describe : describe.skip;

postgres('payment confirmation and completion on PostgreSQL', () => {
    const database = `ams12_test_${randomUUID().replace(/-/g, '')}`;
    const secret = 'test-webhook-secret';
    const migration = new PaymentCompletion1794500000000();
    const terminalMigration = new PaymentTerminalTime1794600000000();
    let admin: DataSource;
    let db: DataSource;
    let module: TestingModule;
    let service: PaymentService;
    let verification: PaymentVerificationService;
    let provider: MockPaymentProvider;
    let payments: PaymentRepository;
    let user: UserEntity;
    let order: UserOrderEntity;
    let size: PatternSizeEntity;
    const send = jest.fn();

    beforeAll(async () => {
        admin = await new DataSource({
            type: 'postgres',
            url: databaseUrl,
        }).initialize();
        // Создаём только случайную изолированную БД; данные исходного подключения не меняются.
        await admin.query(`CREATE DATABASE "${database}"`);

        const url = new URL(databaseUrl);

        url.pathname = `/${database}`;
        db = await new DataSource({
            type: 'postgres',
            url: url.toString(),
            entities: [join(__dirname, '../../entities/**/*.entity.ts')],
            extra: { max: 12 },
        }).initialize();
        // Подготавливаем изолированную схему и применяем платёжные миграции с реальными триггерами и временем результата.
        await db.query('CREATE SCHEMA users; CREATE SCHEMA patterns');
        await db.synchronize();
        await db.transaction((manager) => terminalMigration.down(manager.queryRunner));
        await db.transaction((manager) => migration.down(manager.queryRunner));
        await db.transaction((manager) => new PaymentAttempts1794000000000().down(manager.queryRunner));
        await db.transaction((manager) => new PaymentAttempts1794000000000().up(manager.queryRunner));
        await db.transaction((manager) => migration.up(manager.queryRunner));
        await db.transaction((manager) => terminalMigration.up(manager.queryRunner));
        await db.getRepository(AppSettingEntity).save({
            version: 1,
            snapshot: {},
        });
    }, 30_000);

    beforeEach(async () => {
        // Очищаем очередь только изолированной тестовой БД, чтобы воркер не обрабатывал письма соседнего сценария.
        await db.getRepository(PaymentEffectEntity).clear();

        const config = new ConfigService({
            NODE_ENV: 'test',
            SITE_URL: 'https://shop.example.test',
            PAYMENT_MOCK_WEBHOOK_SECRET: secret,
        });

        provider = new MockPaymentProvider(config);
        module = await Test.createTestingModule({ providers: [
            PaymentService, PaymentCompletionService, PaymentVerificationService, PaymentEffectsService,
            PaymentRepository, PaymentCompletionRepository, PaymentEffectRepository, UserOrderRepository,
            PatternGrantsService, PatternGrantRepository, UserPatternRepository,
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
            {
                provide: MailService,
                useValue: { send },
            },
        ] }).compile();
        service = module.get(PaymentService);
        verification = module.get(PaymentVerificationService);
        payments = module.get(PaymentRepository);
        send.mockReset().mockResolvedValue(undefined);
        user = await db.getRepository(UserEntity).save({ email: `${randomUUID()}@example.test` });

        const pattern = await db.getRepository(PatternEntity).save({});

        size = await db.getRepository(PatternSizeEntity).save({
            pattern,
            size: await db.getRepository(SizeEntity).save({ value: 36 }),
        });
        order = await pendingOrder();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await module?.close();
    });

    afterAll(async () => {
        await db?.destroy();

        if (admin?.isInitialized) {
            // Удаляем исключительно случайную БД этой suite после завершения всех проверок.
            await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
            await admin.destroy();
        }
    });

    it.each(['webhook-first', 'redirect-first', 'no-webhook'])(
        'completes exactly once via %s and does not clear a cart filled after purchase', async (channel) => {
            const other = await pendingOrder();
            const cart = await db.getRepository(UserOrderEntity).save({
                user,
                status: OrderStatus.OPEN,
            });

            await item(cart.id, false);

            const payment = await attempt(order.id);

            await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);

            if (channel === 'webhook-first') {
                await webhook(payment.externalId);
            } else if (channel === 'redirect-first') {
                await payments.update(payment.id, { nextCheckAt: new Date(0) });
                await verification.getState(user.id, order.id);
            } else {
                await payments.update(payment.id, { nextCheckAt: new Date(0) });
                await verification.reconcile();
            }

            expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PAID);
            expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: other.id })).cancelReason).toBe('another_order_paid');
            expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(2);
            expect(await db.getRepository(OrderPatternEntity).countBy({
                order: { id: cart.id },
            })).toBe(0);

            await item(cart.id, false);
            await Promise.all([webhook(payment.externalId), webhook(payment.externalId), verification.getState(user.id, order.id)]);

            expect(await db.getRepository(OrderPatternEntity).countBy({
                order: { id: cart.id },
            })).toBe(1);
            expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(2);
            expect(await db.getRepository(PaymentEffectEntity).countBy({
                kind: 'purchase_email',
                orderId: order.id,
            })).toBe(1);
        },
    );

    it('serializes captured payments for different orders into one purchase and one compensation incident', async () => {
        const other = await pendingOrder();
        const first = await attempt(order.id);
        const second = await attempt(other.id);

        await provider.setResult(first.externalId, ProviderPaymentStatus.SUCCEEDED);
        await provider.setResult(second.externalId, ProviderPaymentStatus.SUCCEEDED);
        await Promise.all([webhook(first.externalId), webhook(second.externalId)]);

        const results = await db.getRepository(UserOrderEntity).findBy({
            user: { id: user.id },
        });

        expect(results
            .filter((row) => row.status === OrderStatus.PAID)).toHaveLength(1);
        expect(results
            .filter((row) => row.status === OrderStatus.CANCELLED)).toHaveLength(1);
        expect(await payments.countBy({
            resolution: 'compensation_required',
            orderId: other.id,
        }) +
            await payments.countBy({
                resolution: 'compensation_required',
                orderId: order.id,
            })).toBe(1);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ userId: user.id })).toBe(2);
    });

    it('records a late capture after provider cancellation and never revives the cancelled order', async () => {
        const payment = await attempt(order.id);

        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.CANCELLED });
        await verification.verify(payment.id, true, true);
        expect((await payments.findOneByOrFail({ id: payment.id })).status).toBe(PaymentStatus.CANCELLED);
        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(payment.externalId);
        expect(await payments.findOneByOrFail({ id: payment.id })).toMatchObject({
            status: PaymentStatus.SUCCEEDED,
            resolution: 'compensation_required',
        });
        expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.CANCELLED);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(0);
        expect(await db.getRepository(PaymentEffectEntity).countBy({
            kind: 'compensation_required',
            paymentId: payment.id,
        })).toBe(1);
    });

    it('commits a captured payment and compensation incident without calling an unavailable cancellation API', async () => {
        const payment = await attempt(order.id);
        const cancel = jest.spyOn(provider, 'cancelPayment').mockRejectedValue(new Error('Cancellation unavailable'));

        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.CANCELLED });
        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(payment.externalId);
        await verification.verify(payment.id, false, true);

        expect(cancel).not.toHaveBeenCalled();
        expect(await payments.findOneByOrFail({ id: payment.id })).toMatchObject({
            status: PaymentStatus.SUCCEEDED,
            resolution: 'compensation_required',
            checkFailures: 0,
            errorCode: null,
        });
        expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.CANCELLED);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(0);
        expect(await db.getRepository(PaymentEffectEntity).countBy({
            kind: 'compensation_required',
            paymentId: payment.id,
        })).toBe(1);
    });

    it.each([ProviderPaymentStatus.FAILED, ProviderPaymentStatus.CANCELLED])(
        'reconciles an old attempt recently marked %s without extending its terminal window', async (status) => {
            const payment = await attempt(order.id);

            await payments.update(payment.id, { createdAt: new Date(Date.now() - 20 * 86_400_000) });
            await provider.setResult(payment.externalId, status);
            await verification.verify(payment.id, true);

            const terminal = await payments.findOneByOrFail({ id: payment.id });

            expect(terminal.terminalAt).toBeInstanceOf(Date);
            expect(terminal.terminalAt.getTime()).toBeGreaterThan(Date.now() - 10_000);
            await payments.update(payment.id, { nextCheckAt: new Date(0) });
            expect((await payments.dueChecks('mock', 500, 7))
                .some((row) => row.id === payment.id)).toBe(true);

            await verification.verify(payment.id, true);
            expect((await payments.findOneByOrFail({ id: payment.id })).terminalAt).toEqual(terminal.terminalAt);

            const earlier = new Date(Date.now() - 6 * 86_400_000);

            await payments.update(payment.id, {
                terminalAt: earlier,
                nextCheckAt: new Date(0),
            });
            jest.spyOn(provider, 'getPayment').mockRejectedValueOnce(new Error('Provider unavailable'));
            expect(await verification.verify(payment.id, true)).toBe(false);
            expect((await payments.findOneByOrFail({ id: payment.id })).terminalAt).toEqual(earlier);

            await verification.verify(payment.id, true);
            expect((await payments.findOneByOrFail({ id: payment.id })).terminalAt).toEqual(earlier);
            await payments.update(payment.id, {
                terminalAt: new Date(Date.now() - 7 * 86_400_000),
                nextCheckAt: new Date(0),
            });
            expect((await payments.dueChecks('mock', 500, 7))
                .some((row) => row.id === payment.id)).toBe(false);

            await payments.update(payment.id, {
                terminalAt: null,
                nextCheckAt: new Date(0),
            });
            expect((await payments.dueChecks('mock', 500, 7))
                .some((row) => row.id === payment.id)).toBe(true);
        },
    );

    it('backfills terminal times from existing audit timestamps while preserving pending and legacy payments', async () => {
        const pending = await attempt(order.id);
        const failedOrder = await pendingOrder();

        provider.enqueueScenario({ status: ProviderPaymentStatus.FAILED });

        const failed = await attempt(failedOrder.id);
        const cancelledOrder = await pendingOrder();

        provider.enqueueScenario({ status: ProviderPaymentStatus.CANCELLED });

        const cancelled = await attempt(cancelledOrder.id);
        const legacy = await payments.save({ provider: 'legacy' });

        await db.transaction((manager) => terminalMigration.down(manager.queryRunner));
        // Имитируем существовавшие до миграции конечные результаты, не изменяя их финансовый статус.
        await db.query(`UPDATE "users"."user_payment_entity"
            SET "updatedAt" = CURRENT_TIMESTAMP - interval '2 days' WHERE "id" = ANY($1::int[])`, [[failed.id, cancelled.id]]);
        // Читаем ожидаемое время в часовом поясе БД, как при переносе из прежнего timestamp в timestamptz.
        const previous: { id: number; terminal_at: Date }[] = await db.query(`SELECT "id", "updatedAt"::timestamptz AS terminal_at
            FROM "users"."user_payment_entity" WHERE "id" = ANY($1::int[])`, [[failed.id, cancelled.id]]);

        await db.transaction((manager) => terminalMigration.up(manager.queryRunner));

        for (const row of previous) {
            expect((await payments.findOneByOrFail({ id: row.id })).terminalAt).toEqual(row.terminal_at);
        }

        expect((await payments.findOneByOrFail({ id: pending.id })).terminalAt).toBeNull();
        expect((await payments.findOneByOrFail({ id: legacy.id })).terminalAt).toBeNull();
    });

    it('does not trust a signed payload status or authorization without capture, and rejects invalid signatures', async () => {
        const payment = await attempt(order.id);

        await expect(verification.webhook('mock', { externalId: payment.externalId }, 'invalid')).rejects.toMatchObject({ status: 401 });
        await provider.setResult(payment.externalId, ProviderPaymentStatus.AUTHORIZED);
        await webhook(payment.externalId);
        expect((await payments.findOneByOrFail({ id: payment.id })).status).toBe(PaymentStatus.PENDING);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ userId: user.id })).toBe(0);
    });

    it.each(['amount', 'currency', 'orderId', 'externalId'])(
        'rejects a provider %s mismatch without marking money or order successful', async (field) => {
            const payment = await attempt(order.id);
            const result = await provider.getPayment(payment.externalId);

            jest.spyOn(provider, 'getPayment').mockResolvedValueOnce({
                ...result,
                status: ProviderPaymentStatus.SUCCEEDED,
                captured: true,
                paidAt: new Date(),
                [field]: field === 'currency' ? 'USD' : field === 'externalId' ? 'foreign' : 999999,
            });
            expect(await verification.verify(payment.id, true)).toBe(false);
            expect((await payments.findOneByOrFail({ id: payment.id })).status).toBe(PaymentStatus.PENDING);
            expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PENDING_PAYMENT);
        },
    );

    it('rolls back payment, order, rights, cart and outbox when granting fails, then retries successfully', async () => {
        const payment = await attempt(order.id);
        const grants = module.get(PatternGrantsService);
        const grant = grants.grantPaidOrder.bind(grants);

        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        jest.spyOn(grants, 'grantPaidOrder').mockImplementationOnce(async (...args) => {
            await grant(...args);

            throw new Error('Simulated failure after grants');
        });
        expect(await verification.verify(payment.id, true)).toBe(false);
        expect((await payments.findOneByOrFail({ id: payment.id })).status).toBe(PaymentStatus.PENDING);
        expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ userId: user.id })).toBe(0);
        expect(await db.getRepository(PaymentEffectEntity).countBy({ orderId: order.id })).toBe(0);
        await webhook(payment.externalId);
        expect((await payments.findOneByOrFail({ id: payment.id })).resolution).toBe('completed');
    });

    it('recovers a lost create response without webhook using the original provider key', async () => {
        provider.enqueueScenario({
            status: ProviderPaymentStatus.SUCCEEDED,
            timeoutAfterCreate: true,
        });

        const key = randomUUID();

        await expect(service.createPayment(user.id, order.id, key)).rejects.toMatchObject({ status: 503 });

        const payment = await payments.findOneByOrFail({ orderId: order.id });

        expect(payment.externalId).toBeNull();
        await verification.reconcile();
        expect((await payments.findOneByOrFail({ id: payment.id })).resolution).toBe('completed');
        await expect(service.createPayment(user.id, order.id, key)).resolves.toMatchObject({
            id: payment.id,
            status: PaymentStatus.SUCCEEDED,
        });
        expect(await payments.countBy({ orderId: order.id })).toBe(1);
    });

    it('returns the committed purchase after losing the application response without clearing a newly filled cart', async () => {
        provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED });

        const process = service.processPaymentResult.bind(service);
        const key = randomUUID();

        jest.spyOn(service, 'processPaymentResult').mockImplementationOnce(async (...args) => {
            await process(...args);

            throw new Error('Lost application response after commit');
        });
        await expect(service.createPayment(user.id, order.id, key)).rejects.toThrow('after commit');

        const cart = await db.getRepository(UserOrderEntity).save({
            user,
            status: OrderStatus.OPEN,
        });

        await item(cart.id, false);
        await expect(service.createPayment(user.id, order.id, key)).resolves.toMatchObject({ status: PaymentStatus.SUCCEEDED });
        expect(await payments.countBy({ orderId: order.id })).toBe(1);
        expect(await db.getRepository(OrderPatternEntity).countBy({
            order: { id: cart.id },
        })).toBe(1);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(2);
    });

    it('cancels even a nonoverlapping pending order when another purchase succeeds', async () => {
        const pattern = await db.getRepository(PatternEntity).save({});
        const otherSize = await db.getRepository(PatternSizeEntity).save({
            pattern,
            size: await db.getRepository(SizeEntity).save({ value: 38 }),
        });

        const other = await pendingOrder(otherSize);
        const payment = await attempt(order.id);

        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(payment.externalId);
        expect((await db.getRepository(UserOrderEntity).findOneByOrFail({ id: other.id })).status).toBe(OrderStatus.CANCELLED);
    });

    it.each(['owner', 'order'])('preserves capture as an incident when the %s is inactive', async (target) => {
        const payment = await attempt(order.id);

        if (target === 'owner') {
            await db.getRepository(UserEntity).update(user.id, { state: ModelState.INACTIVE });
        } else {
            await db.getRepository(UserOrderEntity).update(order.id, { state: ModelState.INACTIVE });
        }

        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(payment.externalId);
        expect((await payments.findOneByOrFail({ id: payment.id })).resolution).toBe('compensation_required');
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ userId: user.id })).toBe(0);
    });

    it('keeps an unknown provider state pending with no rights and ignores stale failures after capture', async () => {
        const payment = await attempt(order.id);

        await provider.setResult(payment.externalId, ProviderPaymentStatus.UNKNOWN);
        await webhook(payment.externalId);
        expect((await payments.findOneByOrFail({ id: payment.id })).status).toBe(PaymentStatus.PENDING);
        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(payment.externalId);
        await provider.setResult(payment.externalId, ProviderPaymentStatus.FAILED);
        await webhook(payment.externalId);
        expect(await payments.findOneByOrFail({ id: payment.id })).toMatchObject({
            status: PaymentStatus.SUCCEEDED,
            resolution: 'completed',
        });
    });

    it('backs off a provider outage and never recreates a reserved payment by a user request after cancellation', async () => {
        const payment = await attempt(order.id);
        const get = jest.spyOn(provider, 'getPayment').mockRejectedValueOnce(new Error('Provider unavailable'));

        expect(await verification.verify(payment.id, true)).toBe(false);

        const stored = await payments.findOneByOrFail({ id: payment.id });

        expect(stored.checkFailures).toBe(1);
        expect(stored.nextCheckAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
        await verification.getState(user.id, order.id);
        expect(get).toHaveBeenCalledTimes(1);
        await db.getRepository(UserOrderEntity).update(order.id, { status: OrderStatus.CANCELLED });

        const create = jest.spyOn(provider, 'createPayment');

        await expect(service.createPayment(user.id, order.id, stored.idempotencyKey)).rejects.toMatchObject({ status: 400 });
        expect(create).not.toHaveBeenCalled();
    });

    it('cancels other active external attempts after commit and reliably retries a failed purchase email', async () => {
        const other = await pendingOrder();
        const first = await attempt(order.id);
        const second = await attempt(other.id);

        await provider.setResult(first.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(first.externalId);
        expect((await provider.getPayment(second.externalId)).status).toBe(ProviderPaymentStatus.PENDING);
        send.mockRejectedValueOnce(new Error('SMTP unavailable'));
        await module.get(PaymentEffectsService).drain();
        expect((await provider.getPayment(second.externalId)).status).toBe(ProviderPaymentStatus.CANCELLED);

        const mail = await db.getRepository(PaymentEffectEntity).findOneByOrFail({
            kind: 'purchase_email',
            orderId: order.id,
        });

        expect(mail.completedAt).toBeNull();
        // Передвигаем только изолированную тестовую очередь для проверки повторной доставки без ожидания таймера.
        await db.getRepository(PaymentEffectEntity).update(mail.id, { availableAt: new Date(0) });
        await module.get(PaymentEffectsService).drain();
        expect((await db.getRepository(PaymentEffectEntity).findOneByOrFail({ id: mail.id })).completedAt).toBeInstanceOf(Date);
        expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ messageId: `<purchase-${order.id}@ameralds>` }));
    });

    it('checks ownership before calling the provider and limits repeated checks across concurrent requests', async () => {
        const payment = await attempt(order.id);
        const get = jest.spyOn(provider, 'getPayment');

        await expect(verification.getState(user.id + 100000, order.id)).rejects.toMatchObject({ status: 400 });
        expect(get).not.toHaveBeenCalled();
        await payments.update(payment.id, { nextCheckAt: new Date(0) });
        await Promise.all(Array.from({ length: 5 }, () => verification.getState(user.id, order.id)));
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('protects the completion audit from rollback and leases outbox work to only one worker', async () => {
        const payment = await attempt(order.id);

        await expect(payments.update(payment.id, { resolution: 'completed' })).rejects.toMatchObject({
            driverError: { code: '23514' },
        });
        await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
        await webhook(payment.externalId);
        await expect(db.transaction((manager) => migration.down(manager.queryRunner))).rejects.toThrow('Cannot discard');

        const effects = module.get(PaymentEffectRepository);
        const claims = await Promise.all([effects.claim(), effects.claim()]);

        expect(claims
            .filter((claim) => claim !== null)).toHaveLength(1);
        expect((await payments.findOneByOrFail({ id: payment.id })).resolution).toBe('completed');
    });

    /** Создаёт заказ с фиксированной суммой и оплачиваемыми правами в изолированной тестовой БД. */
    async function pendingOrder(selected: PatternSizeEntity = size): Promise<UserOrderEntity> {
        const placed = await db.getRepository(UserOrderEntity).save({
            user,
            status: OrderStatus.PENDING_PAYMENT,
            placedAt: new Date(),
            subtotalAmount: 12345,
            totalAmount: 12345,
            currency: 'RUB',
            paymentExpiresAt: new Date(Date.now() + 60_000),
            appSettingsVersion: 1,
        });

        await item(placed.id, true, selected);

        return placed;
    }

    /** Создаёт позицию со snapshot, не зависящим от последующих изменений каталога. */
    async function item(orderId: number, snapshot: boolean, selected: PatternSizeEntity = size): Promise<void> {
        await db.getRepository(OrderPatternEntity).save({
            order: { id: orderId },
            pattern: selected.pattern,
            sizes: [selected],
            color: true,
            snapshot: snapshot ? {
                patternId: selected.pattern.id,
                name: {
                    ru: 'Схема',
                    en: null,
                },
                sizes: [{
                    patternSizeId: selected.id,
                    sizeId: selected.size.id,
                    value: 36,
                }],
                color: true,
                requiresPatternPurchase: true,
                currency: 'RUB',
                subtotalAmount: 12345,
                discountAmount: 0,
                totalAmount: 12345,
                discounts: [],
                components: [],
            } : null,
        });
    }

    /** Возвращает сохранённую попытку с известным внешним ID для сценария подтверждения. */
    async function attempt(orderId: number): Promise<UserPaymentEntity & { externalId: string }> {
        const result = await service.createPayment(user.id, orderId, randomUUID());
        const payment = await payments.findOneByOrFail({ id: result.id });

        if (!payment.externalId) {
            throw new Error('Expected external payment identity');
        }

        return {
            ...payment,
            externalId: payment.externalId,
        };
    }

    /** Подписывает только ID; поддельный статус payload не должен определять финансовый результат. */
    async function webhook(externalId: string): Promise<void> {
        await verification.webhook('mock', {
            externalId,
            status: 'succeeded',
            amount: 1,
        },
            createHmac('sha256', secret).update(externalId).digest('hex'));
    }
});
