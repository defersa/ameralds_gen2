import { AppSettingEntity } from '@am-back/db/entities/app-setting.entity';
import { OrderPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { SizeEntity } from '@am-back/db/entities/patterns/size.entity';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentEffectEntity } from '@am-back/db/entities/purchases/payment-effect.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { UserEntity, UserRole } from '@am-back/db/entities/user.entity';
import { PatternGrantsService } from '@am-back/db/service/pattern-grants/pattern-grants.service';
import { PatternGrantRepository } from '@am-back/db/service/pattern-grants/repositories/pattern-grant.repository';
import { UserPatternRepository } from '@am-back/db/service/pattern-grants/repositories/user-pattern.repository';
import { PaymentCompletionService } from '@am-back/db/service/payment/payment-completion.service';
import { PaymentService } from '@am-back/db/service/payment/payment.service';
import { MockPaymentProvider } from '@am-back/db/service/payment/providers/mock-payment.provider';
import { PaymentCompletionRepository } from '@am-back/db/service/payment/repositories/payment-completion.repository';
import { PaymentRepository } from '@am-back/db/service/payment/repositories/payment.repository';
import { PAYMENT_PROVIDER, ProviderPaymentStatus } from '@am-back/db/service/payment/types/payment-provider';
import { RefundProcessingService } from '@am-back/db/service/refunds/refund-processing.service';
import { RefundReservationService } from '@am-back/db/service/refunds/refund-reservation.service';
import { RefundDiscoveryService } from '@am-back/db/service/refunds/refund-discovery.service';
import { RefundDiscoveryRepository } from '@am-back/db/service/refunds/repositories/refund-discovery.repository';
import { RefundResultService } from '@am-back/db/service/refunds/refund-result.service';
import { RefundRepository } from '@am-back/db/service/refunds/repositories/refund.repository';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource, IsNull } from 'typeorm';
import { ExternalRefunds1795000000000 } from '../../../../../database/migrations/1795000000000-external-refunds';
import { toUserOrderSummary } from '../mappers/order.mapper';
import { AdminOrderCancellation1794900000000 } from '../../../../../database/migrations/1794900000000-admin-order-cancellation';
import { AdminPlacedOrderRepository } from '../repositories/admin-placed-order.repository';
import { UserOrderRepository } from '../repositories/user-order.repository';
import { AdminPlacedOrderActionsService } from './admin-placed-order-actions.service';
import { AdminPlacedOrdersService } from './admin-placed-orders.service';


const databaseUrl = process.env.ORDER_TEST_DATABASE_URL;
const postgres = databaseUrl ? describe : describe.skip;

postgres('administrative placed orders on PostgreSQL', () => {
    const database = `ams14_test_${randomUUID().replace(/-/g, '')}`;
    let control: DataSource;
    let db: DataSource;
    let module: TestingModule;
    let view: AdminPlacedOrdersService;
    let actions: AdminPlacedOrderActionsService;
    let payments: PaymentService;
    let processing: RefundProcessingService;
    let provider: MockPaymentProvider;
    let user: UserEntity;
    let actor: UserEntity;
    let order: UserOrderEntity;
    let size: PatternSizeEntity;

    beforeAll(async () => {
        control = await new DataSource({
            type: 'postgres',
            url: databaseUrl,
        }).initialize();
        // Создаём исключительно случайную изолированную БД; исходные данные подключения не изменяются.
        await control.query(`CREATE DATABASE "${database}"`);

        const url = new URL(databaseUrl);

        url.pathname = `/${database}`;
        db = await new DataSource({
            type: 'postgres',
            url: url.toString(),
            entities: [join(__dirname, '../../../entities/**/*.entity.ts')],
            extra: { max: 12 },
        }).initialize();
        // Схемы и таблицы создаются только в одноразовой БД теста.
        await db.query('CREATE SCHEMA users; CREATE SCHEMA patterns');
        await db.synchronize();
        // Воспроизводим схему до новой миграции, затем проверяем реальный DDL с внешним ключом и индексом.
        await db.query(
            'ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "fk_order_cancellation_actor", DROP COLUMN "cancelled_by"',
        );
        await db.transaction((manager) => new AdminOrderCancellation1794900000000().up(manager.queryRunner));
        // Проверяем миграцию внешних операций на прежней схеме без потери локальных возвратов.
        await db.query(`DROP TABLE "users"."refund_incident"; DROP TYPE "users"."refund_incident_state_enum";
            ALTER TABLE "users"."refund" DROP COLUMN origin;
            ALTER TABLE "users"."user_payment_entity" DROP COLUMN next_refund_check_at`);
        await db.transaction(manager => new ExternalRefunds1795000000000().up(manager.queryRunner));
    }, 30_000);

    beforeEach(async () => {
        // Очищаем только случайную тестовую БД; CASCADE удаляет связанные заказы, платежи, права и операции.
        await db.query('TRUNCATE TABLE "user_entity" CASCADE');
        await db.getRepository(AppSettingEntity).save({
            version: 1,
            snapshot: {},
        });
        user = await db.getRepository(UserEntity).save({ email: 'buyer@example.test' });
        actor = await db.getRepository(UserEntity).save({
            email: 'admin@example.test',
            role: UserRole.ADMIN,
        });

        const pattern = await db.getRepository(PatternEntity).save({});
        const config = new ConfigService({
            NODE_ENV: 'test',
            SITE_URL: 'https://shop.example.test',
        });

        size = await db.getRepository(PatternSizeEntity).save({
            pattern,
            size: await db.getRepository(SizeEntity).save({ value: 36 }),
        });
        provider = new MockPaymentProvider(config);
        module = await Test.createTestingModule({
            providers: [
                AdminPlacedOrdersService,
                AdminPlacedOrderActionsService,
                AdminPlacedOrderRepository,
                UserOrderRepository,
                PaymentService,
                PaymentRepository,
                PaymentCompletionService,
                PaymentCompletionRepository,
                RefundRepository,
                RefundReservationService,
                RefundProcessingService,
                RefundResultService,
                RefundDiscoveryService,
                RefundDiscoveryRepository,
                PatternGrantsService,
                PatternGrantRepository,
                UserPatternRepository,
                {
                    provide: DataSource,
                    useValue: db,
                },
                {
                    provide: ConfigService,
                    useValue: config,
                },
                {
                    provide: PAYMENT_PROVIDER,
                    useValue: provider,
                },
            ],
        }).compile();
        view = module.get(AdminPlacedOrdersService);
        actions = module.get(AdminPlacedOrderActionsService);
        payments = module.get(PaymentService);
        processing = module.get(RefundProcessingService);
        order = await pendingOrder();
    });

    afterEach(async () => {
        await module?.close();
    });

    afterAll(async () => {
        await db?.destroy();

        if (control?.isInitialized) {
            // Удаляем только БД с уникальным именем этой suite после закрытия всех её подключений.
            await control.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
            await control.destroy();
        }
    });

    it('combines filters, includes the whole final day, excludes OPEN and has stable pagination', async () => {
        const second = await pendingOrder();
        const third = await pendingOrder();

        await db.getRepository(UserOrderEntity).save({
            user,
            status: OrderStatus.OPEN,
        });
        await db.getRepository(UserOrderEntity).update([order.id, second.id], {
            createdAt: new Date('2026-11-22T23:59:59.999Z'),
        });
        await db.getRepository(UserOrderEntity).update(third.id, {
            createdAt: new Date('2026-11-23T00:00:00Z'),
        });

        const filters = {
            page: 1,
            pageSize: 1,
            user: 'BUYER',
            statuses: [OrderStatus.PENDING_PAYMENT],
            createdFrom: '2026-11-22T00:00:00Z',
            createdBefore: '2026-11-23T00:00:00Z',
        };
        const first = await view.list(filters);
        const next = await view.list({
            ...filters,
            page: 2,
        });

        expect(first).toMatchObject({
            total: 2,
            count: 2,
            page: 1,
            pageSize: 1,
        });
        expect(first.items[0].id).toBe(second.id);
        expect(next.items[0].id).toBe(order.id);
        expect(first.items[0].user).toEqual({
            id: user.id,
            email: user.email,
        });
        expect(
            (
                await view.list({
                    page: 1,
                    pageSize: 20,
                    user: String(user.id),
                })
            ).total,
        ).toBe(3);
        expect(
            (
                await view.list({
                    page: 1,
                    pageSize: 20,
                    user: '%',
                })
            ).total,
        ).toBe(0);
    });

    it('shows orders copied from administrative carts and missing legacy resources without recalculating prices', async () => {
        const source = await db.getRepository(AdminOrderEntity).save({
            isComplete: true,
        });
        const legacy = await db.getRepository(UserOrderEntity).save({
            user,
            sourceAdminOrder: source,
            status: OrderStatus.PAID,
        });

        await db.getRepository(OrderPatternEntity).save({
            order: legacy,
            color: true,
        });

        const list = await view.list({
            page: 1,
            pageSize: 20,
        });
        const details = await view.details(legacy.id);

        expect(list.items
            .some((item) => item.id === legacy.id)).toBe(true);
        expect(details.totalAmount).toBeNull();
        expect(details.refundUnavailableReason).not.toBeNull();
        expect(details.patterns[0]).toMatchObject({
            name: null,
            snapshot: null,
            sizes: [],
            color: true,
        });
        await db.getRepository(UserOrderEntity).update(legacy.id, {
            user: null,
        });
        expect((await view.details(legacy.id)).user).toBeNull();
        await expect(
            view.details(
                (
                    await db.getRepository(UserOrderEntity).save({
                        status: OrderStatus.OPEN,
                    })
                ).id,
            ),
        ).rejects.toMatchObject({ status: 400 });
    });

    it('cancels once with audit and durable cancellation of all pending external attempts', async () => {
        const attempt = await payments.createPayment(user.id, order.id, randomUUID());

        const secondActor = await db.getRepository(UserEntity).save({
            email: 'second-admin@example.test',
            role: UserRole.ADMIN,
        });

        await Promise.all([
            actions.cancel(actor.id, order.id, 'Первый запрос'),
            actions.cancel(secondActor.id, order.id, 'Конкурентный запрос'),
        ]);

        const saved = await db.getRepository(UserOrderEntity).findOneByOrFail({
            id: order.id,
        });
        const repeated = await actions.cancel(actor.id, order.id, 'Повтор');

        expect([actor.id, secondActor.id]).toContain(saved.cancelledBy);
        expect(repeated.cancelReason).toBe(saved.cancelReason);
        expect(repeated.cancelledAt).toEqual(saved.cancelledAt);
        expect(
            await db.getRepository(PaymentEffectEntity).countBy({
                kind: 'cancel_payment',
                paymentId: attempt.id,
            }),
        ).toBe(1);
        expect(repeated.history).toEqual(
            expect.arrayContaining([
            expect.objectContaining({
                actorId: saved.cancelledBy,
                    reason: saved.cancelReason,
                }),
            ]),
        );
        await expect(payments.createPayment(user.id, order.id, randomUUID())).rejects.toMatchObject({ status: 400 });
    });

    it('rejects cancellation of a paid order and rejects an administrator whose role was revoked', async () => {
        await payOrder();
        await expect(actions.cancel(actor.id, order.id, 'Устаревшая страница')).rejects.toMatchObject({ status: 400 });
        await db.getRepository(UserEntity).update(actor.id, {
            role: UserRole.COMMON,
        });
        await expect(actions.cancel(actor.id, order.id, 'Нет роли')).rejects.toMatchObject({ status: 403 });
        await expect(actions.refund(actor.id, order.id, 'Нет роли')).rejects.toMatchObject({ status: 403 });
    });

    it.each(['cancel-first', 'capture-first'] as const)(
        'preserves captured money in the cancellation race: %s',
        async (first) => {
            const attempt = await payments.createPayment(user.id, order.id, randomUUID());
            const stored = await db.getRepository(UserPaymentEntity).findOneByOrFail({
                id: attempt.id,
            });

            if (!stored.externalId) {
                throw new Error('Expected external identity');
            }

            await provider.setResult(stored.externalId, ProviderPaymentStatus.SUCCEEDED);

            const captured = await provider.getPayment(stored.externalId);
            const capture = (): Promise<unknown> =>
                payments.processPaymentResult(user.id, order.id, attempt.id, captured);
            const cancel = (): Promise<unknown> => actions.cancel(actor.id, order.id, 'Отмена');
            const outcome = await Promise.allSettled(
                first === 'cancel-first' ? [cancel(), capture()] : [capture(), cancel()],
            );
            const final = await db.getRepository(UserPaymentEntity).findOneByOrFail({
                id: attempt.id,
            });
            const current = await db.getRepository(UserOrderEntity).findOneByOrFail({
                id: order.id,
            });

            expect(outcome
                .some((result) => result.status === 'fulfilled')).toBe(true);
            expect(final.status).toBe(PaymentStatus.SUCCEEDED);

            if (current.status === OrderStatus.CANCELLED) {
                expect(final.resolution).toBe('compensation_required');
                expect(
                    await db.getRepository(PaymentEffectEntity).countBy({
                        paymentId: attempt.id,
                        kind: 'compensation_required',
                    }),
                ).toBe(1);
                expect(
                    await db.getRepository(UserPatternGrantEntity).countBy({
                        orderId: order.id,
                    }),
                ).toBe(0);
            } else {
                expect(current.status).toBe(OrderStatus.PAID);
                expect(final.resolution).toBe('completed');
            }
        },
    );

    it('records a late capture after committed cancellation as a compensation incident without issuing rights', async () => {
        const attempt = await payments.createPayment(user.id, order.id, randomUUID());
        const stored = await db.getRepository(UserPaymentEntity).findOneByOrFail({ id: attempt.id });

        if (!stored.externalId) {
            throw new Error('Expected external identity');
        }

        await actions.cancel(actor.id, order.id, 'Отмена до списания');
        await provider.setResult(stored.externalId, ProviderPaymentStatus.SUCCEEDED);

        const captured = await provider.getPayment(stored.externalId);
        const result = await payments.processPaymentResult(user.id, order.id, attempt.id, captured);

        expect(result.status).toBe(PaymentStatus.SUCCEEDED);
        expect(result.resolution).toBe('compensation_required');
        expect((await view.details(order.id)).status).toBe(OrderStatus.CANCELLED);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id })).toBe(0);
        expect(await db.getRepository(PaymentEffectEntity).countBy({ paymentId: attempt.id, kind: 'compensation_required' })).toBe(1);
    });

    it('rolls back status and audit if the durable cancellation cannot be queued', async () => {
        await payments.createPayment(user.id, order.id, randomUUID());

        const enqueue = jest.spyOn(module.get(PaymentCompletionRepository), 'enqueue').mockRejectedValueOnce(new Error('outbox unavailable'));

        await expect(actions.cancel(actor.id, order.id, 'Причина')).rejects.toThrow('outbox unavailable');

        const current = await view.details(order.id);

        expect(current.status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(current.cancelledAt).toBeNull();
        expect(current.cancelReason).toBeNull();
        enqueue.mockRestore();
    });

    it('warns about color purchased in another order and preserves that basis after the refund', async () => {
        await payOrder();

        const otherOrder = await db.getRepository(UserOrderEntity).save({ user, status: OrderStatus.PAID });
        const otherItem = await db.getRepository(OrderPatternEntity).save({ order: otherOrder, pattern: size.pattern, color: true });
        const colorGrant = await db.getRepository(UserPatternGrantEntity).save({
            userId: user.id,
            patternId: size.pattern.id,
            patternSizeId: null,
            rightKey: 'color',
            sourceType: 'order',
            orderId: otherOrder.id,
            orderItemId: otherItem.id,
        });

        expect((await view.details(order.id)).colorAccessWarnings).toContain(size.pattern.id);

        const accepted = await actions.refund(actor.id, order.id, 'Возврат последнего размера');

        await processing.start(accepted.refunds[0].id);
        expect((await db.getRepository(UserPatternGrantEntity).findOneByOrFail({ id: colorGrant.id })).revokedAt).toBeNull();
    });

    it('reserves one full refund, keeps PAID while accepted, then revokes only this order on confirmed success', async () => {
        const paymentId = await payOrder();

        const requests = await Promise.all([
            actions.refund(actor.id, order.id, 'Полный возврат'),
            actions.refund(actor.id, order.id, 'Повтор'),
        ]);

        expect(requests[0].status).toBe(OrderStatus.PAID);
        expect(requests[0].refunds[0]).toMatchObject({
            amount: 12345,
            status: 'accepted',
            paymentId,
        });
        expect(
            await db.getRepository(RefundEntity).countBy({
                orderId: order.id,
            }),
        ).toBe(1);
        expect(requests[0].colorAccessWarnings).toContain(size.pattern.id);
        await processing.start(requests[0].refunds[0].id);

        const finished = await view.details(order.id);

        expect(finished.status).toBe(OrderStatus.REFUNDED);
        expect(finished.totalAmount).toBe(12345);
        expect(finished.refunds[0].status).toBe('succeeded');
        expect(
            await db.getRepository(UserPatternGrantEntity).countBy({
                orderId: order.id,
                revokedAt: IsNull(),
            }),
        ).toBe(0);
        expect((await db.getRepository(UserPaymentEntity).findOneByOrFail({ id: paymentId })).status).toBe(
            PaymentStatus.SUCCEEDED,
        );
        await actions.refund(actor.id, order.id, 'Повтор после успеха');
        expect(
            await db.getRepository(RefundEntity).countBy({
                orderId: order.id,
            }),
        ).toBe(1);
        expect(JSON.stringify(finished)).not.toMatch(/idempotencyKey|confirmationUrl|password|checkFailures/);
    });

    it('keeps unknown refunds blocked until reconciliation and allows a new attempt only after a final failure', async () => {
        await payOrder();
        provider.enqueueRefundScenario({
            timeoutAfterCreate: true,
        });

        const accepted = await actions.refund(actor.id, order.id, 'Потерянный ответ');
        const refundId = accepted.refunds[0].id;

        await processing.start(refundId);
        expect((await view.details(order.id)).refunds[0].status).toBe('unknown');
        await actions.refund(actor.id, order.id, 'Повтор неизвестного');
        expect(
            await db.getRepository(RefundEntity).countBy({
                orderId: order.id,
            }),
        ).toBe(1);
        await db.getRepository(RefundEntity).update(refundId, {
            nextCheckAt: new Date(0),
        });
        await processing.verify(refundId);
        expect((await view.details(order.id)).status).toBe(OrderStatus.REFUNDED);
    });

    it('preserves access on failure and displays a new operation after an explicit retry', async () => {
        await payOrder();
        provider.enqueueRefundScenario({ status: 'failed' });

        const accepted = await actions.refund(actor.id, order.id, 'Первый возврат');

        await processing.start(accepted.refunds[0].id);

        const failed = await view.details(order.id);

        expect(failed.status).toBe(OrderStatus.PAID);
        expect(failed.refundUnavailableReason).toBeNull();
        expect(
            await db.getRepository(UserPatternGrantEntity).countBy({
                orderId: order.id,
                revokedAt: IsNull(),
            }),
        ).toBe(2);
        await actions.refund(actor.id, order.id, 'Повтор после отказа');
        expect(
            await db.getRepository(RefundEntity).countBy({
                orderId: order.id,
            }),
        ).toBe(2);
    });

    it('refunds the exact discounted total of multiple patterns and revokes every position atomically', async () => {
        const first = await db.getRepository(OrderPatternEntity).findOneByOrFail({ order: { id: order.id } });
        const pattern = await db.getRepository(PatternEntity).save({});
        const secondSize = await db.getRepository(PatternSizeEntity).save({
            pattern, size: await db.getRepository(SizeEntity).save({ value: 40 }),
        });

        first.snapshot = { ...first.snapshot, subtotalAmount: 6500, discountAmount: 500, totalAmount: 6000 };
        await db.getRepository(OrderPatternEntity).save(first);
        await db.getRepository(OrderPatternEntity).save({
            order, pattern, sizes: [secondSize], color: true,
            snapshot: {
                ...first.snapshot, patternId: pattern.id,
                sizes: [{ patternSizeId: secondSize.id, sizeId: secondSize.size.id, value: 40 }],
                subtotalAmount: 6500, discountAmount: 155, totalAmount: 6345,
            },
        });
        await payOrder();
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(4);
        const accepted = await actions.refund(actor.id, order.id, 'Все позиции');

        await processing.start(accepted.refunds[0].id);
        const returned = await view.details(order.id);

        expect(returned.refund.amount).toBe(12345);
        expect(returned.patterns).toHaveLength(2);
        expect(returned.totalAmount).toBe(12345);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(0);
    });

    it('discovers an external full refund by webhook without a local actor and keeps repeated events idempotent', async () => {
        const paymentId = await payOrder();
        const payment = await db.getRepository(UserPaymentEntity).findOneByOrFail({ id: paymentId });

        provider.recordExternalRefund({
            externalId: 'dashboard-full', paymentExternalId: payment.externalId, idempotencyKey: null,
            amount: payment.amount, currency: payment.currency, status: 'succeeded',
        });
        jest.spyOn(provider, 'verifyWebhook').mockResolvedValue('dashboard-full');
        const send = jest.spyOn(provider, 'refundPayment');

        await Promise.all([
            processing.webhook('mock', {}, 'signed'),
            processing.webhook('mock', {}, 'signed'),
        ]);
        const details = await view.details(order.id);

        expect(details.status).toBe(OrderStatus.REFUNDED);
        expect(details.refunds).toHaveLength(1);
        expect(details.refunds[0]).toMatchObject({ origin: 'provider', initiatedBy: null, externalId: 'dashboard-full', status: 'succeeded' });
        expect(details.refund).toMatchObject({ status: 'succeeded', amount: 12345 });
        expect(send).not.toHaveBeenCalled();
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(0);
        expect(await db.getRepository(PaymentEffectEntity).countBy({ orderId: order.id, kind: 'refund_email' })).toBe(1);
        await payments.processPaymentResult(user.id, order.id, paymentId, await provider.getPayment(payment.externalId));
        expect((await view.details(order.id)).status).toBe(OrderStatus.REFUNDED);
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(0);

        const loaded = await module.get(UserOrderRepository).findPlacedOrder(user.id, order.id);
        const summary = toUserOrderSummary(loaded);

        expect(summary.refund.status).toBe('succeeded');
        expect(JSON.stringify(summary)).not.toMatch(/dashboard-full|initiatedBy|idempotencyKey|origin|reason/);
        expect(await module.get(UserOrderRepository).findPlacedOrder(actor.id, order.id)).toBeNull();
    });

    it('finds missed external refunds on old payments, preserves access while pending and reconciles later success', async () => {
        const paymentId = await payOrder();
        const payment = await db.getRepository(UserPaymentEntity).findOneByOrFail({ id: paymentId });
        const discovery = module.get(RefundDiscoveryService);

        await db.getRepository(UserPaymentEntity).update(paymentId, { createdAt: new Date('2020-01-01'), nextRefundCheckAt: new Date(0) });
        provider.recordExternalRefund({
            externalId: 'dashboard-pending', paymentExternalId: payment.externalId, idempotencyKey: null,
            amount: payment.amount, currency: payment.currency, status: 'pending',
        });
        const send = jest.spyOn(provider, 'refundPayment');

        await discovery.reconcile();
        const pending = await view.details(order.id);

        expect(pending.status).toBe(OrderStatus.PAID);
        expect(pending.refund.status).toBe('processing');
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(2);
        await provider.setRefundResult('dashboard-pending', 'succeeded');
        await db.getRepository(RefundEntity).update(pending.refunds[0].id, { nextCheckAt: new Date(0) });
        await processing.reconcile();
        expect((await view.details(order.id)).status).toBe(OrderStatus.REFUNDED);
        expect(send).not.toHaveBeenCalled();
    });

    it('records one partial external refund incident, retains rights and blocks blind full retries', async () => {
        const paymentId = await payOrder();
        const payment = await db.getRepository(UserPaymentEntity).findOneByOrFail({ id: paymentId });
        const discovery = module.get(RefundDiscoveryService);
        const result = {
            externalId: 'dashboard-partial', paymentExternalId: payment.externalId, idempotencyKey: null,
            amount: 500, currency: payment.currency, status: 'succeeded' as const,
        };

        await Promise.all([discovery.observe('mock', result), discovery.observe('mock', result)]);
        const details = await view.details(order.id);

        expect(details.status).toBe(OrderStatus.PAID);
        expect(details.refunds).toHaveLength(0);
        expect(details.refundIncidents).toHaveLength(1);
        expect(details.refundIncidents[0]).toMatchObject({ kind: 'partial_refund', amount: 500, externalId: 'dashboard-partial', providerStatus: 'succeeded' });
        expect(details.refundUnavailableReason).toContain('расхождение');
        await discovery.observe('mock', { ...result, status: 'pending' });
        expect((await view.details(order.id)).refundIncidents[0].providerStatus).toBe('succeeded');
        expect(await db.getRepository(UserPatternGrantEntity).countBy({ orderId: order.id, revokedAt: IsNull() })).toBe(2);
        await expect(actions.refund(actor.id, order.id, 'Слепой повтор')).rejects.toMatchObject({ status: 400 });
        await expect(db.transaction(manager => new ExternalRefunds1795000000000().down(manager.queryRunner))).rejects.toThrow('audit');
    });

    it('recovers the original operation after a failed local commit without repeating provider refund', async () => {
        await payOrder();
        const accepted = await actions.refund(actor.id, order.id, 'Сбой после внешнего успеха');
        const grants = module.get(PatternGrantsService);
        const revoke = jest.spyOn(grants, 'revokeRefundedOrder').mockRejectedValueOnce(new Error('Local failure'));
        const send = jest.spyOn(provider, 'refundPayment');

        await processing.start(accepted.refunds[0].id);
        expect((await view.details(order.id)).status).toBe(OrderStatus.PAID);
        expect((await view.details(order.id)).refund.status).toBe('unknown');
        await db.getRepository(RefundEntity).update(accepted.refunds[0].id, { nextCheckAt: new Date(0) });
        await processing.verify(accepted.refunds[0].id);
        expect((await view.details(order.id)).status).toBe(OrderStatus.REFUNDED);
        expect(send).toHaveBeenCalledTimes(1);
        expect(revoke).toHaveBeenCalledTimes(2);
    });

    /** Создаёт оформленный заказ и снимок размера с сохранённой скидкой в одноразовой БД. */
    async function pendingOrder(): Promise<UserOrderEntity> {
        const placed = await db.getRepository(UserOrderEntity).save({
            user,
            status: OrderStatus.PENDING_PAYMENT,
            placedAt: new Date(),
            subtotalAmount: 13000,
            discountAmount: 655,
            totalAmount: 12345,
            currency: 'RUB',
            paymentExpiresAt: new Date(Date.now() + 600_000),
            appSettingsVersion: 1,
        });

        await db.getRepository(OrderPatternEntity).save({
            order: placed,
            pattern: size.pattern,
            sizes: [size],
            color: true,
            snapshot: {
                patternId: size.pattern.id,
                name: {
                    ru: 'Историческое название',
                    en: null,
                },
                sizes: [
                    {
                        patternSizeId: size.id,
                        sizeId: size.size.id,
                        value: 36,
                    },
                ],
                color: true,
                requiresPatternPurchase: true,
                currency: 'RUB',
                subtotalAmount: 13000,
                discountAmount: 655,
                totalAmount: 12345,
                discounts: [],
                components: [],
            },
        });

        return placed;
    }

    /** Подтверждает mock-списание через общий обработчик и возвращает ID финансового факта. */
    async function payOrder(): Promise<number> {
        provider.enqueueScenario({
            status: ProviderPaymentStatus.SUCCEEDED,
        });

        const attempt = await payments.createPayment(user.id, order.id, randomUUID());

        return attempt.id;
    }
});
