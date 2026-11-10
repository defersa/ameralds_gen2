import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { DataSource } from 'typeorm';
import { testService } from '../../../../test/feature-services';
import { createOrderPatternSnapshot } from '../order/pricing/order-snapshot';
import { PatternGrantsService } from './pattern-grants.service';
import { PatternGrantRepository } from './repositories/pattern-grant.repository';
import { UserPatternRepository } from './repositories/user-pattern.repository';
import type { RevokePatternGrants } from './types/revoke-pattern-grants';


describe('pattern grant domain safeguards', () => {
    const runner = new DataSource({ type: 'postgres' }).createQueryRunner();
    const manager = runner.manager;

    const grants = {
        lockOwner: jest.fn(),
        lockSourceOrder: jest.fn(),
        insertOnce: jest.fn(),
        findEffective: jest.fn(),
        isAdministrator: jest.fn(),
        findSelected: jest.fn(),
        revokeOnce: jest.fn(),
    };

    const purchases = { project: jest.fn() };
    let service: PatternGrantsService;
    let order: UserOrderEntity;
    let item: OrderPatternEntity;
    let revoke: RevokePatternGrants;
    let selected: UserPatternGrantEntity;

    beforeEach(async () => {
        jest.resetAllMocks();
        Object.defineProperty(runner, 'isTransactionActive', { value: true, configurable: true });

        const pattern = Object.assign(new PatternEntity(), {
            id: 7,
            state: ModelState.ACTIVE,
            basePrice: { ru: 10 },
            additionalPrice: { ru: 2 },
            colorPrice: { ru: 3 },
        });

        item = Object.assign(new OrderPatternEntity(), {
            id: 31,
            state: ModelState.ACTIVE,
            pattern,
            color: true,
            requiresPatternPurchase: true,
            sizes: [Object.assign(new PatternSizeEntity(), { id: 21, pattern, state: ModelState.ACTIVE })],
        });
        item.snapshot = createOrderPatternSnapshot(item, 'RUB');
        order = Object.assign(new UserOrderEntity(), {
            id: 17,
            status: OrderStatus.PAID,
            paidAt: new Date('2026-11-10'),
            patterns: [item],
        });
        selected = Object.assign(new UserPatternGrantEntity(), {
            id: 1,
            userId: 42,
            patternId: 7,
            patternSizeId: 21,
            rightKey: 'size:21',
            orderId: 17,
            orderItemId: 31,
            legacyPurchaseId: null,
            sourceType: 'order',
            revokedAt: null,
        });
        revoke = {
            userId: 42,
            source: { type: 'order', orderId: 17, orderItemId: 31 },
            grantIds: [1],
            reason: 'Возврат размера',
            refundReference: 'confirmed-refund-1',
        };
        grants.lockOwner.mockResolvedValue({ id: 42, state: ModelState.ACTIVE });
        grants.lockSourceOrder.mockResolvedValue(order);
        grants.findEffective.mockResolvedValue([selected]);
        grants.isAdministrator.mockResolvedValue(true);
        grants.findSelected.mockResolvedValue([selected]);
        service = await testService(PatternGrantsService, [
            { provide: PatternGrantRepository, useValue: grants },
            { provide: UserPatternRepository, useValue: purchases },
        ]);
    });

    it('grants only snapshot options and keeps color independent from sizes', async () => {
        item.color = false;
        await service.grantPaidOrder(42, 17, manager);
        expect(grants.insertOnce.mock.calls
            .map(([grant]) => grant.rightKey)).toEqual(['size:21', 'color']);
        expect(grants.insertOnce).toHaveBeenCalledWith(expect.objectContaining({
            userId: 42, orderId: 17, orderItemId: 31, sourceType: 'order', patternSizeId: null, rightKey: 'color',
        }), manager);
    });

    it.each([OrderStatus.OPEN, OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, OrderStatus.REFUNDED])('does not issue unpaid or refunded rights for %s', async (status) => {
        order.status = status;
        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.insertOnce).not.toHaveBeenCalled();
    });

    it('rejects a foreign or absent source order', async () => {
        grants.lockSourceOrder.mockResolvedValue(null);
        await expect(service.grantPaidOrder(42, 999, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.insertOnce).not.toHaveBeenCalled();
    });

    it.each(['missing snapshot', 'foreign pattern', 'invalid size', 'duplicate size'] as const)('rejects %s before issuing options', async (target) => {
        if (target === 'missing snapshot') {
            item.snapshot = null;
        }

        if (target === 'foreign pattern') {
            item.snapshot.patternId = 8;
        }

        if (target === 'invalid size') {
            item.snapshot.sizes[0].patternSizeId = -1;
        }

        if (target === 'duplicate size') {
            item.snapshot.sizes.push({ ...item.snapshot.sizes[0] });
        }

        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.insertOnce).not.toHaveBeenCalled();
    });

    it.each(['deleted size', 'deleted pattern', 'inactive size', 'inactive pattern', 'reassigned size'] as const)('preserves paid snapshot rights after a %s', async (target) => {
        if (target === 'deleted size') {
            item.sizes = [];
        }

        if (target === 'deleted pattern') {
            item.pattern = null;
            item.sizes = [];
        }

        if (target === 'inactive size') {
            item.sizes[0].state = ModelState.INACTIVE;
        }

        if (target === 'inactive pattern') {
            item.pattern.state = ModelState.INACTIVE;
        }

        if (target === 'reassigned size') {
            item.sizes[0].pattern = Object.assign(new PatternEntity(), { id: 8 });
        }

        await service.grantPaidOrder(42, 17, manager);
        expect(grants.insertOnce.mock.calls
            .map(([grant]) => ({ patternId: grant.patternId, rightKey: grant.rightKey }))).toEqual([
            { patternId: 7, rightKey: 'size:21' },
            { patternId: 7, rightKey: 'color' },
        ]);
        expect(purchases.project).toHaveBeenCalledWith(42, 7, [selected], manager);
    });

    it('does not issue live options absent from the paid snapshot', async () => {
        item.snapshot.color = false;
        item.sizes.push(Object.assign(new PatternSizeEntity(), { id: 22, pattern: item.pattern }));
        await service.grantPaidOrder(42, 17, manager);
        expect(grants.insertOnce).toHaveBeenCalledTimes(1);
        expect(grants.insertOnce).toHaveBeenCalledWith(expect.objectContaining({ rightKey: 'size:21' }), manager);
    });

    it('preserves the active selection of administrative orders without a snapshot', async () => {
        order.sourceAdminOrder = Object.assign(new AdminOrderEntity(), {
            isComplete: true,
            state: ModelState.ACTIVE,
        });
        item.snapshot = null;
        item.sizes.push(Object.assign(new PatternSizeEntity(), {
            id: 22,
            pattern: item.pattern,
            state: ModelState.INACTIVE,
        }));
        await service.grantPaidOrder(42, 17, manager);
        expect(grants.insertOnce.mock.calls
            .map(([grant]) => grant.rightKey)).toEqual(['size:21', 'color']);
    });

    it('rejects foreign live sizes for administrative orders without a snapshot', async () => {
        order.sourceAdminOrder = Object.assign(new AdminOrderEntity(), {
            isComplete: true,
            state: ModelState.ACTIVE,
        });
        item.snapshot = null;
        item.sizes[0].pattern = Object.assign(new PatternEntity(), { id: 8 });
        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.insertOnce).not.toHaveBeenCalled();
    });

    it('denies new grants but permits an authorized refund for an inactive owner', async () => {
        grants.lockOwner.mockResolvedValue({ id: 42, state: ModelState.INACTIVE });
        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.insertOnce).not.toHaveBeenCalled();

        order.status = OrderStatus.REFUNDED;
        await service.revokeSelected(99, revoke, manager);
        expect(grants.revokeOnce).toHaveBeenCalledWith([1], 99, revoke.reason, revoke.refundReference, manager);
        expect(purchases.project).toHaveBeenCalledWith(42, 7, [selected], manager);
    });

    it('rejects issuance and revocation for an absent owner', async () => {
        grants.lockOwner.mockResolvedValue(null);
        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toMatchObject({ status: 400 });
        await expect(service.revokeSelected(99, revoke, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.insertOnce).not.toHaveBeenCalled();
        expect(grants.revokeOnce).not.toHaveBeenCalled();
    });

    it('requires a transaction for both issuing and revoking rights', async () => {
        Object.defineProperty(runner, 'isTransactionActive', { value: false, configurable: true });
        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toMatchObject({ status: 400 });
        await expect(service.revokeSelected(99, revoke, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.lockOwner).not.toHaveBeenCalled();
    });

    it('requires an active administrator and a refunded order', async () => {
        grants.isAdministrator.mockResolvedValue(false);
        await expect(service.revokeSelected(43, revoke, manager)).rejects.toMatchObject({ status: 403 });
        grants.isAdministrator.mockResolvedValue(true);
        await expect(service.revokeSelected(99, revoke, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.revokeOnce).not.toHaveBeenCalled();
    });

    it.each(['owner', 'item', 'order', 'legacy source'] as const)('rejects revocation outside the selected %s', async (target) => {
        order.status = OrderStatus.PARTIALLY_REFUNDED;

        if (target === 'owner') {
            grants.findSelected.mockResolvedValue([]);
        }

        if (target === 'item') {
            selected.orderItemId = 32;
        }

        if (target === 'order') {
            selected.orderId = 18;
        }

        if (target === 'legacy source') {
            selected.sourceType = 'legacy';
        }

        await expect(service.revokeSelected(99, revoke, manager)).rejects.toMatchObject({ status: 400 });
        expect(grants.revokeOnce).not.toHaveBeenCalled();
    });

    it('reprojects all remaining sources after an explicitly scoped refund', async () => {
        order.status = OrderStatus.PARTIALLY_REFUNDED;
        revoke.grantIds = [1, 1];
        await service.revokeSelected(99, revoke, manager);
        expect(grants.revokeOnce).toHaveBeenCalledWith([1], 99, 'Возврат размера', 'confirmed-refund-1', manager);
        expect(purchases.project).toHaveBeenCalledWith(42, 7, [selected], manager);
    });

    it('propagates a projection failure so the caller rolls back grants and the order together', async () => {
        const error = new Error('projection failed');

        purchases.project.mockRejectedValue(error);
        await expect(service.grantPaidOrder(42, 17, manager)).rejects.toBe(error);
    });
});
