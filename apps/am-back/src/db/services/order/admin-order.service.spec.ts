import { HttpStatus } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import { PatternOrdersService } from '../patterns/pattern-orders.service';
import { AdminOrderMailService } from './admin-order-mail.service';
import { AdminOrderService } from './admin-order.service';


describe('AdminOrderService.completeOrder', () => {
    let service: AdminOrderService;
    let order: AdminOrderEntity;
    let committed: boolean;
    let repository: {
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
    };
    let sendCompletedOrder: jest.Mock;

    beforeEach(() => {
        committed = false;
        order = Object.assign(new AdminOrderEntity(), {
            id: 1,
            state: ModelState.ACTIVE,
            isComplete: false,
            email: 'previous@example.com',
            vk: 'previous-vk',
            patterns: [Object.assign(new OrderPatternEntity(), { id: 10 })],
        });
        repository = {
            findOne: jest.fn().mockResolvedValue(order),
            create: jest.fn((details) => Object.assign(new AdminOrderEntity(), details)),
            save: jest.fn(async (entity: AdminOrderEntity) => {
                if (!entity.id) {
                    entity.id = 2;
                    entity.state = ModelState.ACTIVE;
                }

                return entity;
            }),
        };
        const manager = {
            getRepository: jest.fn().mockReturnValue(repository),
        } as unknown as EntityManager;
        const dataSource = {
            getRepository: jest.fn().mockReturnValue({}),
            dataSource: {
                transaction: jest.fn(async (callback) => {
                    const result = await callback(manager);
                    committed = true;
                    return result;
                }),
            },
        } as unknown as DataSourceService;
        sendCompletedOrder = jest.fn().mockImplementation(async () => {
            expect(committed).toBe(true);
        });
        service = new AdminOrderService(
            dataSource,
            {} as PatternOrdersService,
            { sendCompletedOrder } as unknown as AdminOrderMailService,
        );
    });

    it('completes the current order, preserves its items and opens an empty cart', async () => {
        const patterns = order.patterns;
        const result = await service.completeOrder({
            email: 'buyer@example.com',
            vk: 'buyer-vk',
        });

        expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { isComplete: false, state: ModelState.ACTIVE },
            lock: { mode: 'pessimistic_write' },
            relationLoadStrategy: 'query',
        }));
        expect(order).toMatchObject({
            id: 1,
            isComplete: true,
            email: 'buyer@example.com',
            vk: 'buyer-vk',
        });
        expect(order.patterns).toBe(patterns);
        expect(result).toMatchObject({
            order: {
                id: 2,
                state: ModelState.ACTIVE,
                isComplete: false,
                email: '',
                patterns: [],
            },
            price: { en: 0, ru: 0 },
        });
        expect(sendCompletedOrder).toHaveBeenCalledTimes(1);
        expect(sendCompletedOrder).toHaveBeenCalledWith(order);
    });

    it('keeps existing contacts when no contacts are provided', async () => {
        await service.completeOrder();

        expect(order).toMatchObject({
            isComplete: true,
            email: 'previous@example.com',
            vk: 'previous-vk',
        });
    });

    it('returns a cart error without creating an order or sending mail if no cart exists', async () => {
        repository.findOne.mockResolvedValue(null);

        await expect(service.completeOrder()).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
        expect(repository.save).not.toHaveBeenCalled();
        expect(sendCompletedOrder).not.toHaveBeenCalled();
        expect(committed).toBe(false);
    });

    it('does not send mail if creating the new cart fails', async () => {
        const error = new Error('Cannot create the new cart');
        repository.save.mockResolvedValueOnce(order).mockRejectedValueOnce(error);

        await expect(service.completeOrder()).rejects.toThrow(error);
        expect(committed).toBe(false);
        expect(sendCompletedOrder).not.toHaveBeenCalled();
    });
});
