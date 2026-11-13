import { ModelState } from '@am-back/db/abstract/abstract.model';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { testService } from '../../../../test/feature-services';
import { UserOrderRepository } from '../order/repositories/user-order.repository';
import { PaymentService } from './payment.service';
import { PaymentCompletionService } from './payment-completion.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentRepository } from './repositories/payment.repository';
import { PAYMENT_PROVIDER, ProviderPaymentStatus } from './types/payment-provider';


describe('PaymentService', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    let order: UserOrderEntity;
    let rows: UserPaymentEntity[];
    let service: PaymentService;
    let provider: MockPaymentProvider;
    let config: ConfigService;

    const orders = {
        lockOwner: jest.fn(),
        lockForPayment: jest.fn(),
        databaseTime: jest.fn(),
        findPlacedOrder: jest.fn(),
    };

    const payments = {
        findByKey: jest.fn(),
        bindKey: jest.fn(),
        findBlocking: jest.fn(),
        reserve: jest.fn(),
        lock: jest.fn(),
        saveResult: jest.fn(),
        recordError: jest.fn(),
    };

    beforeEach(async () => {
        jest.resetAllMocks();
        rows = [];
        config = new ConfigService({
            NODE_ENV: 'test',
            SITE_URL: 'https://shop.example.test',
        });
        provider = new MockPaymentProvider(config);

        order = Object.assign(new UserOrderEntity(), {
            id: 17,
            state: ModelState.ACTIVE,
            user: { id: 42 },
            status: OrderStatus.PENDING_PAYMENT,
            sourceAdminOrder: null,
            totalAmount: 12345,
            currency: 'RUB',
            placedAt: now,
            paymentExpiresAt: new Date(now.getTime() + 60_000),
        });

        orders.lockForPayment.mockImplementation(async (id, userId) =>
            id === order.id && userId === order.user.id && order.state === ModelState.ACTIVE ? order : null,
        );
        orders.databaseTime.mockResolvedValue(now);
        orders.findPlacedOrder.mockImplementation(async () => order);
        payments.findByKey.mockImplementation(async (key) => rows
            .find((row) => row.idempotencyKey === key) ?? null);
        payments.findBlocking.mockImplementation(
            async () =>
                rows
                    .find((row) => row.status === PaymentStatus.PENDING || row.status === PaymentStatus.SUCCEEDED) ??
                null,
        );
        payments.reserve.mockImplementation(async (orderId, idempotencyKey, name, amount, currency) => {
            const payment = Object.assign(new UserPaymentEntity(), {
                id: rows.length + 1,
                orderId,
                idempotencyKey,
                provider: name,
                amount,
                currency,
                status: PaymentStatus.PENDING,
                externalId: null,
                confirmationUrl: null,
                paidAt: null,
                terminalAt: null,
                createdAt: now,
            });

            rows
                .push(payment);

            return { ...payment };
        });
        payments.lock.mockImplementation(async (id) => ({ ...rows
            .find((row) => row.id === id) }));
        payments.saveResult.mockImplementation(async (row) => {
            const index = rows
                .findIndex((stored) => stored.id === row.id);

            rows[index] = row;

            return row;
        });

        service = await testService(PaymentService, [
            { provide: PaymentCompletionService, useValue: { completeOrder: jest.fn() } },
            {
                provide: DataSource,
                useValue: { transaction: async (work) => work({}) },
            },
            {
                provide: UserOrderRepository,
                useValue: orders,
            },
            {
                provide: PaymentRepository,
                useValue: payments,
            },
            {
                provide: PAYMENT_PROVIDER,
                useValue: provider,
            },
            {
                provide: ConfigService,
                useValue: config,
            },
        ]);
    });

    it('commits a reservation before calling the provider and returns a safe DTO with the server price', async () => {
        const create = jest.spyOn(provider, 'createPayment');
        const key = randomUUID();
        const result = await service.createPayment(42, 17, key);

        expect(result).toMatchObject({
            orderId: 17,
            amount: 12345,
            currency: 'RUB',
            status: 'PENDING',
            testMode: true,
        });
        expect(result.confirmationUrl).toBe('https://shop.example.test/account/orders/17');
        expect(result).not.toHaveProperty('externalId');
        expect(result).not.toHaveProperty('idempotencyKey');
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                idempotencyKey: key,
                amount: 12345,
            }),
        );
        expect(payments.reserve.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
        expect(orders.lockOwner.mock.invocationCallOrder[0]).toBeLessThan(
            orders.lockForPayment.mock.invocationCallOrder[0],
        );
        expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it.each([
        OrderStatus.OPEN,
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
        OrderStatus.PARTIALLY_REFUNDED,
    ])('rejects order status %s', async (status) => {
        order.status = status;

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        expect(payments.reserve).not.toHaveBeenCalled();
    });

    it.each(['foreign', 'missing', 'inactive'])('does not reveal a %s order', async (scenario) => {
        if (scenario === 'inactive') {
            order.state = ModelState.INACTIVE;
        }

        await expect(
            service.createPayment(scenario === 'foreign' ? 99 : 42, scenario === 'missing' ? 99 : 17, randomUUID()),
        ).rejects.toMatchObject({
            response: { code: 'NOT_EXIST' },
        });
        expect(payments.reserve).not.toHaveBeenCalled();
    });

    it.each([null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid server amount %s', async (amount) => {
        order.totalAmount = amount;

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
    });

    it('rejects the expiration boundary, missing currency and administrative sources', async () => {
        order.paymentExpiresAt = now;

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        order.paymentExpiresAt = new Date(now.getTime() + 60_000);
        order.currency = null;

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        order.currency = 'RUB';
        order.sourceAdminOrder = Object.assign(new AdminOrderEntity(), { id: 91 });

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
    });

    it('recovers a lost provider response using the committed attempt and the same external key', async () => {
        provider.enqueueScenario({ timeoutAfterCreate: true });

        const key = randomUUID();
        const create = jest.spyOn(provider, 'createPayment');

        await expect(service.createPayment(42, 17, key)).rejects.toMatchObject({
            status: 503,
            response: { code: 'PAYMENT_UNAVAILABLE' },
        });
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe(PaymentStatus.PENDING);

        const retry = await service.createPayment(42, 17, key);

        expect(retry.id).toBe(rows[0].id);
        expect(payments.reserve).toHaveBeenCalledTimes(1);
        expect(create.mock.calls[0][0].idempotencyKey).toBe(create.mock.calls[1][0].idempotencyKey);
        expect(payments.recordError).toHaveBeenCalledWith(rows[0].id, 'provider_unavailable');
    });

    it('bounds a delayed provider call to ten seconds and safely reuses its reservation', async () => {
        jest.useFakeTimers();

        try {
            provider.enqueueScenario({ delayMs: 20_000 });

            const key = randomUUID();
            const failure = expect(service.createPayment(42, 17, key)).rejects.toMatchObject({ status: 503 });

            await jest.advanceTimersByTimeAsync(10_001);
            await failure;
            await expect(service.createPayment(42, 17, key)).resolves.toMatchObject({ status: 'PENDING' });
            expect(payments.reserve).toHaveBeenCalledTimes(1);
            await jest.advanceTimersByTimeAsync(10_000);
        } finally {
            jest.useRealTimers();
        }
    });

    it.each([ProviderPaymentStatus.FAILED, ProviderPaymentStatus.CANCELLED])(
        'keeps audit and allows a new key after %s',
        async (status) => {
            provider.enqueueScenario({ status });

            const key = randomUUID();
            const first = await service.createPayment(42, 17, key);
            const duplicate = await service.createPayment(42, 17, key);
            const retry = await service.createPayment(42, 17, randomUUID());

            expect(duplicate).toEqual(first);
            expect(retry.id).not.toBe(first.id);
            expect(rows).toHaveLength(2);
        },
    );

    it('keeps authorization pending and blocks new attempts after a captured payment without completing the order', async () => {
        provider.enqueueScenario({ status: ProviderPaymentStatus.AUTHORIZED });

        const authorized = await service.createPayment(42, 17, randomUUID());

        expect(authorized.status).toBe(PaymentStatus.PENDING);
        expect(authorized.paidAt).toBeNull();
        rows = [];
        provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED });

        await expect(service.createPayment(42, 17, randomUUID())).resolves.toMatchObject({ status: 'SUCCEEDED' });
        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'PAYMENT_CONFLICT' },
        });
        expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it.each([ProviderPaymentStatus.FAILED, ProviderPaymentStatus.CANCELLED])(
        'starts the late-capture window on %s and preserves it on repeated checks', async (status) => {
            const attempt = await service.createPayment(42, 17, randomUUID());
            const payment = rows[0];
            const terminalTime = new Date(now.getTime() + 86_400_000);
            const later = new Date(terminalTime.getTime() + 3_600_000);

            expect(payment.terminalAt).toBeNull();
            payment.createdAt = new Date(now.getTime() - 10 * 86_400_000);
            await provider.setResult(payment.externalId, status);
            orders.databaseTime.mockResolvedValue(terminalTime);
            await service.processPaymentResult(42, 17, attempt.id, await provider.getPayment(payment.externalId));
            expect(rows[0].terminalAt).toEqual(terminalTime);

            orders.databaseTime.mockResolvedValue(later);
            await service.processPaymentResult(42, 17, attempt.id, await provider.getPayment(payment.externalId));
            expect(rows[0].checkedAt).toEqual(later);
            expect(rows[0].terminalAt).toEqual(terminalTime);

            await provider.setResult(payment.externalId, ProviderPaymentStatus.SUCCEEDED);
            await service.processPaymentResult(42, 17, attempt.id, await provider.getPayment(payment.externalId));
            expect(rows[0].status).toBe(PaymentStatus.SUCCEEDED);
            expect(rows[0].terminalAt).toEqual(terminalTime);
        },
    );

    it.each(['amount', 'currency', 'orderId', 'externalId', 'confirmationUrl', 'captured'])(
        'rejects a mismatched provider %s without creating a replacement payment',
        async (field) => {
            const create = provider.createPayment.bind(provider);

            jest.spyOn(provider, 'createPayment').mockImplementationOnce(async (input) => {
                const result = await create(input);

                switch (field) {
                    case 'amount':
                        return {
                            ...result,
                            amount: 1,
                        };
                    case 'currency':
                        return {
                            ...result,
                            currency: 'USD',
                        };
                    case 'orderId':
                        return {
                            ...result,
                            orderId: 999,
                        };
                    case 'externalId':
                        return {
                            ...result,
                            externalId: '',
                        };
                    case 'confirmationUrl':
                        return {
                            ...result,
                            confirmationUrl: 'javascript:alert(1)',
                        };
                    default:
                        return {
                            ...result,
                            status: ProviderPaymentStatus.SUCCEEDED,
                            captured: false,
                        };
                }
            });

            const key = randomUUID();

            await expect(service.createPayment(42, 17, key)).rejects.toMatchObject({
                response: { code: 'PAYMENT_UNAVAILABLE' },
            });
            expect(rows[0].status).toBe(PaymentStatus.PENDING);
            await expect(service.createPayment(42, 17, key)).resolves.toMatchObject({ id: rows[0].id });
            expect(rows).toHaveLength(1);
        },
    );

    it('records a captured result after concurrent cancellation but never returns a payment link or marks the order paid', async () => {
        provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED });

        const create = provider.createPayment.bind(provider);

        jest.spyOn(provider, 'createPayment').mockImplementationOnce(async (input) => {
            order.status = OrderStatus.CANCELLED;

            return create(input);
        });

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        expect(rows[0].status).toBe(PaymentStatus.SUCCEEDED);
        expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('refuses mock creation and test controls in production before reserving a payment', async () => {
        config.set('NODE_ENV', 'production');

        await expect(service.createPayment(42, 17, randomUUID())).rejects.toMatchObject({ status: 503 });
        expect(payments.reserve).not.toHaveBeenCalled();
        expect(() => provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED })).toThrow('only in tests');
        await expect(
            provider.createPayment({
                idempotencyKey: randomUUID(),
                orderId: 17,
                amount: 1,
                currency: 'RUB',
                returnUrl: 'https://shop.example.test',
            }),
        ).rejects.toMatchObject({ status: 503 });
    });
});
