import { ModelState } from '@am-back/db/abstract/abstract.model';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { UserEntity } from '@am-back/db/entities/user.entity';
import { DataSource, type EntityManager } from 'typeorm';
import { repositoryFixture, testService } from '../../../../../test/feature-services';
import { PAYMENT_EXPIRED_REASON, USER_CANCELLED_REASON } from '../checkout/payment-window';
import { UserOrderRepository } from '../repositories/user-order.repository';
import { CancelUserOrderService } from './cancel-user-order.service';


describe('CancelUserOrderService', () => {
    let service: CancelUserOrderService;
    let order: UserOrderEntity;
    let manager: EntityManager;

    const now = new Date('2026-11-10T12:00:00Z');
    const findOne = jest.fn();
    const findOwner = jest.fn();
    const update = jest.fn();
    const query = jest.fn();

    beforeEach(async () => {
        jest.resetAllMocks();

        order = Object.assign(new UserOrderEntity(), {
            id: 17,
            user: {
                id: 42,
                email: 'private@example.com',
            },
            state: ModelState.ACTIVE,
            status: OrderStatus.PENDING_PAYMENT,
            sourceAdminOrder: null,
            placedAt: new Date('2026-11-09T12:00:00Z'),
            createdAt: new Date('2026-11-09T12:00:00Z'),
            updatedAt: new Date('2026-11-09T12:00:00Z'),
            totalAmount: 12345,
            subtotalAmount: 12345,
            discountAmount: 0,
            currency: 'RUB',
            paymentExpiresAt: new Date('2026-11-16T12:00:00Z'),
            appSettingsVersion: 3,
            cancelledAt: null,
            cancelReason: null,
            patterns: [{ snapshot: { name: 'Схема' } }],
        });

        findOwner.mockResolvedValue({ id: 42 });
        findOne.mockImplementation(async ({ where }) => {
            if (where.id !== order.id || where.user.id !== order.user.id || where.state !== order.state) {
                return null;
            }

            return Object.assign(new UserOrderEntity(), order);
        });
        update.mockImplementation(async (_criteria, changes) => {
            Object.assign(order, changes);

            return { affected: 1 };
        });
        query.mockResolvedValue([{ now }]);

        manager = {
            queryRunner: { isTransactionActive: true },
            query,
            getRepository: entity => entity === UserEntity
                ? { findOneOrFail: findOwner }
                : { findOne, update },
        } as unknown as EntityManager;

        let tail = Promise.resolve();

        const transaction = jest.fn(work => {
            const result = tail.then(async () => {
                const snapshot = { ...order };

                try {
                    return await work(manager);
                } catch (error) {
                    Object.assign(order, snapshot);

                    throw error;
                }
            });

            tail = result.then(() => undefined, () => undefined);

            return result;
        });

        service = await testService(CancelUserOrderService, [
            {
                provide: DataSource,
                useValue: { transaction },
            },
            {
                provide: UserOrderRepository,
                useValue: repositoryFixture(UserOrderRepository, {}),
            },
        ]);
    });

    it('cancels a pending order under owner/order locks and returns safe metadata without changing price or composition', async () => {
        const patterns = order.patterns;
        const deadline = order.paymentExpiresAt;
        const result = await service.cancel(42, 17);

        expect(result).toMatchObject({
            id: 17,
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
            cancelReason: USER_CANCELLED_REASON,
            totalAmount: 12345,
            placedAt: order.placedAt,
        });
        expect(result).not.toHaveProperty('user');
        expect(result).not.toHaveProperty('patterns');
        expect(order.patterns).toBe(patterns);
        expect(order.paymentExpiresAt).toBe(deadline);
        expect(findOwner.mock.invocationCallOrder[0]).toBeLessThan(findOne.mock.invocationCallOrder[0]);
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                id: 17,
                user: { id: 42 },
                state: ModelState.ACTIVE,
            },
            lock: { mode: 'pessimistic_write' },
        }));

        const [criteria, changes] = update.mock.calls[0];

        expect(criteria).toMatchObject({
            id: 17,
            user: { id: 42 },
            state: ModelState.ACTIVE,
            status: OrderStatus.PENDING_PAYMENT,
        });
        expect(criteria.sourceAdminOrder.type).toBe('isNull');
        expect(changes).toEqual({
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
            cancelReason: USER_CANCELLED_REASON,
            updatedAt: now,
        });
    });

    it.each(['foreign', 'missing', 'inactive'])('rejects a %s order without changing it', async scenario => {
        if (scenario === 'inactive') {
            order.state = ModelState.INACTIVE;
        }

        const userId = scenario === 'foreign' ? 99 : 42;
        const orderId = scenario === 'missing' ? 99 : 17;

        await expect(service.cancel(userId, orderId)).rejects.toMatchObject({
            status: 400,
            response: { code: 'NOT_EXIST' },
        });
        expect(update).not.toHaveBeenCalled();
    });

    it.each([OrderStatus.OPEN, OrderStatus.PAID, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED])(
        'rejects a disallowed status %s',
        async status => {
            order.status = status;

            await expect(service.cancel(42, 17)).rejects.toMatchObject({
                status: 400,
                response: { code: 'INVALID' },
            });
            expect(update).not.toHaveBeenCalled();
        },
    );

    it('rejects an administrative source even if the status is pending', async () => {
        order.sourceAdminOrder = Object.assign(new AdminOrderEntity(), { id: 9 });

        await expect(service.cancel(42, 17)).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        expect(update).not.toHaveBeenCalled();
    });

    it.each([USER_CANCELLED_REASON, PAYMENT_EXPIRED_REASON])('preserves an existing cancellation: %s', async reason => {
        const earlier = new Date('2026-11-10T10:00:00Z');

        Object.assign(order, {
            status: OrderStatus.CANCELLED,
            cancelledAt: earlier,
            cancelReason: reason,
        });

        await expect(service.cancel(42, 17)).resolves.toMatchObject({
            status: OrderStatus.CANCELLED,
            cancelledAt: earlier,
            cancelReason: reason,
        });
        expect(update).not.toHaveBeenCalled();
        expect(query).not.toHaveBeenCalled();
    });

    it('makes concurrent duplicate cancellations idempotent', async () => {
        const [first, second] = await Promise.all([
            service.cancel(42, 17),
            service.cancel(42, 17),
        ]);

        expect(second).toEqual(first);
        expect(update).toHaveBeenCalledTimes(1);
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('does not report success when the conditional update no longer matches', async () => {
        update.mockResolvedValueOnce({ affected: 0 });

        await expect(service.cancel(42, 17)).rejects.toMatchObject({
            response: { code: 'INVALID' },
        });
        expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('rolls back a failed transaction and allows retrying', async () => {
        update.mockImplementationOnce(async (_criteria, changes) => {
            Object.assign(order, changes);

            throw new Error('Database write failed');
        });

        await expect(service.cancel(42, 17)).rejects.toThrow('Database write failed');
        expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(order.cancelledAt).toBeNull();

        await expect(service.cancel(42, 17)).resolves.toMatchObject({
            status: OrderStatus.CANCELLED,
        });
    });
});
