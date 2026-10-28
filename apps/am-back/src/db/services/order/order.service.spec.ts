import { HttpStatus } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '../../entities/purchases/order.entity';
import { UserEntity } from '../../entities/user.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import { UserPatternService } from '../general/user-pattern.service';
import { PatternOrdersService } from '../patterns/pattern-orders.service';
import { PatternsService } from '../patterns/patterns.service';
import { UserService } from '../user.service';
import { OrderService } from './order.service';

describe('OrderService.getCompletedUserOrder', () => {
    it('requests only an active completed order belonging to the current user', async () => {
        const findOne = jest.fn().mockResolvedValue(null);
        const service = new OrderService(
            { getRepository: () => ({ findOne }) } as unknown as DataSourceService,
            {} as PatternOrdersService, {} as UserPatternService, {} as PatternsService, {} as UserService,
        );
        await expect(service.getCompletedUserOrder({ id: 42 } as UserEntity, 17)).rejects.toMatchObject({
            status: 400, response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 17, user: { id: 42 }, state: ModelState.ACTIVE, status: OrderStatus.SUCCESS },
        }));
    });

    it('exposes only presentation fields and handles a deleted pattern', async () => {
        const stored = Object.assign(new UserOrderEntity(), {
            id: 17, status: OrderStatus.SUCCESS, user: { id: 42, passwordHash: 'secret' }, sourceAdminOrder: { email: 'private@example.com' },
            patterns: [Object.assign(new OrderPatternEntity(), {
                id: 31, state: ModelState.ACTIVE, pattern: null, color: true,
                sizes: [Object.assign(new PatternSizeEntity(), { id: 21, state: ModelState.ACTIVE, size: { id: 5, value: 36 }, pdf: { path: '/private/file.pdf' } })],
            })],
        });
        const service = new OrderService(
            { getRepository: () => ({ findOne: async () => stored }) } as unknown as DataSourceService,
            {} as PatternOrdersService, {} as UserPatternService, {} as PatternsService, {} as UserService,
        );
        const result = await service.getCompletedUserOrder({ id: 42 } as UserEntity, 17);
        expect(result).toMatchObject({ id: 17, patterns: [{ id: 31, name: null, images: [], color: true, sizes: [{ id: 21, size: { value: 36 } }] }] });
        expect(JSON.stringify(result)).not.toContain('secret');
        expect(JSON.stringify(result)).not.toContain('/private/');
        expect(result).not.toHaveProperty('user');
        expect(result).not.toHaveProperty('sourceAdminOrder');
    });
});

describe('OrderService.createFromAdminOrder', () => {
    let service: OrderService;
    let manager: EntityManager;
    let adminOrder: AdminOrderEntity;
    let user: UserEntity;
    let getOrCreateUserWithoutPassword: jest.Mock;
    let addBoughtPatterns: jest.Mock;
    let orderRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
    let patternRepository: { create: jest.Mock; save: jest.Mock };
    let cartRepository: { save: jest.Mock };

    beforeEach(() => {
        user = Object.assign(new UserEntity(), { id: 42, email: 'buyer@example.com' });
        adminOrder = Object.assign(new AdminOrderEntity(), {
            id: 1, state: ModelState.ACTIVE, isComplete: true, email: 'buyer@example.com',
            patterns: [Object.assign(new OrderPatternEntity(), {
                id: 31, state: ModelState.ACTIVE,
                pattern: Object.assign(new PatternEntity(), { id: 7, state: ModelState.ACTIVE }),
                sizes: [Object.assign(new PatternSizeEntity(), { id: 21, state: ModelState.ACTIVE })],
                color: true, requiresPatternPurchase: true,
            })],
        });
        orderRepository = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn(details => Object.assign(new UserOrderEntity(), details)),
            save: jest.fn(async order => Object.assign(order, { id: 2 })),
        };
        patternRepository = {
            create: jest.fn(details => Object.assign(new OrderPatternEntity(), details)),
            save: jest.fn(async patterns => patterns.map((item, index) => Object.assign(item, { id: 32 + index }))),
        };
        cartRepository = { save: jest.fn() };
        manager = {
            getRepository: jest.fn(entity => entity === UserOrderEntity ? orderRepository : patternRepository),
        } as unknown as EntityManager;
        getOrCreateUserWithoutPassword = jest.fn().mockResolvedValue(user);
        addBoughtPatterns = jest.fn().mockResolvedValue(undefined);
        service = new OrderService(
            { getRepository: jest.fn().mockReturnValue(cartRepository) } as unknown as DataSourceService,
            {} as PatternOrdersService,
            { addBoughtPatterns } as unknown as UserPatternService,
            {} as PatternsService,
            { getOrCreateUserWithoutPassword } as unknown as UserService,
        );
    });

    it('creates a completed personal order with independent items and grants its purchases in the same transaction', async () => {
        const originalItem = adminOrder.patterns[0];
        originalItem.adminOrder = adminOrder;

        const result = await service.createFromAdminOrder(adminOrder, manager);

        expect(result).toMatchObject({ id: 2, user, status: OrderStatus.SUCCESS, sourceAdminOrder: adminOrder });
        expect(result.patterns[0]).toMatchObject({
            id: 32, order: result, pattern: originalItem.pattern,
            sizes: [{ id: 21 }], color: true, requiresPatternPurchase: true,
        });
        expect(result.patterns[0]).not.toBe(originalItem);
        expect(result.patterns[0].sizes).not.toBe(originalItem.sizes);
        expect(result.patterns[0].adminOrder).toBeUndefined();
        expect(originalItem.id).toBe(31);
        expect(originalItem.adminOrder).toBe(adminOrder);
        expect(originalItem.order).toBeUndefined();
        expect(getOrCreateUserWithoutPassword).toHaveBeenCalledWith('buyer@example.com', manager);
        expect(addBoughtPatterns).toHaveBeenCalledWith(user, result.patterns, manager);
        expect(cartRepository.save).not.toHaveBeenCalled();
    });

    it('uses the newly created passwordless user as the owner of the order and purchases', async () => {
        user = Object.assign(new UserEntity(), { id: 43, email: 'buyer@example.com', passwordHash: null });
        getOrCreateUserWithoutPassword.mockResolvedValue(user);

        const result = await service.createFromAdminOrder(adminOrder, manager);

        expect(result.user).toBe(user);
        expect(addBoughtPatterns).toHaveBeenCalledWith(user, result.patterns, manager);
    });

    it('does not create another personal order or rewrite purchases when called again for the same source', async () => {
        const existing = Object.assign(new UserOrderEntity(), { id: 2, user, status: OrderStatus.SUCCESS });
        orderRepository.findOne.mockResolvedValue(existing);

        await expect(service.createFromAdminOrder(adminOrder, manager)).resolves.toBe(existing);

        expect(orderRepository.save).not.toHaveBeenCalled();
        expect(patternRepository.save).not.toHaveBeenCalled();
        expect(addBoughtPatterns).not.toHaveBeenCalled();
    });

    it.each([undefined, null, ''])('does not create an account or personal order for a VK-only order (%s)', async email => {
        adminOrder.email = email;
        adminOrder.vk = 'https://vk.ru/buyer';

        await expect(service.createFromAdminOrder(adminOrder, manager)).resolves.toBeNull();

        expect(getOrCreateUserWithoutPassword).not.toHaveBeenCalled();
        expect(orderRepository.save).not.toHaveBeenCalled();
        expect(addBoughtPatterns).not.toHaveBeenCalled();
    });

    it.each(['incomplete', 'inactive'])('rejects an %s admin order without granting any purchases', async state => {
        if (state === 'incomplete') adminOrder.isComplete = false;
        if (state === 'inactive') adminOrder.state = ModelState.INACTIVE;

        await expect(service.createFromAdminOrder(adminOrder, manager)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST, response: { code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART },
        });
        expect(getOrCreateUserWithoutPassword).not.toHaveBeenCalled();
        expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('preserves unavailable order items in the personal order history', async () => {
        adminOrder.patterns[0].pattern = null;
        adminOrder.patterns[0].state = ModelState.INACTIVE;

        const result = await service.createFromAdminOrder(adminOrder, manager);

        expect(result.patterns[0]).toMatchObject({ pattern: null, state: ModelState.INACTIVE, sizes: [{ id: 21 }] });
    });
});
