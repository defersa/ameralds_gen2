import { HttpStatus } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import { PatternOrdersService } from '../patterns/pattern-orders.service';
import { AdminOrderMailService } from './admin-order-mail.service';
import { AdminOrderService } from './admin-order.service';


describe('AdminOrderService.getAdminOrderById', () => {
    let service: AdminOrderService;
    let order: AdminOrderEntity;
    let findOne: jest.Mock;

    beforeEach(() => {
        const selectedSize = Object.assign(new PatternSizeEntity(), {
            id: 21,
            size: { id: 3, value: 36 },
        });
        const pattern = Object.assign(new PatternEntity(), {
            id: 7,
            name: { ru: 'Волны', en: 'Waves' },
            description: { ru: 'Описание', en: 'Description' },
            basePrice: { ru: 100, en: 2 },
            additionalPrice: { ru: 50, en: 1 },
            colorPrice: { ru: 25, en: 0.5 },
            hidden: true,
            categories: [{ id: 4 }, { id: 8 }],
            images: [{ id: 9, name: 'Preview', preview: 'preview.webp', full: 'full.webp' }],
            color: { id: 10, name: 'Colors', path: 'colors.pdf' },
            sizes: [
                Object.assign(new PatternSizeEntity(), {
                    ...selectedSize,
                    cbb: { id: 11 },
                    jbb: { id: 12 },
                    pdf: { id: 13 },
                    png: { id: 14 },
                }),
                Object.assign(new PatternSizeEntity(), {
                    id: 22,
                    size: { id: 5, value: 40 },
                    cbb: null,
                    jbb: null,
                    pdf: null,
                    png: null,
                }),
            ],
        });
        order = Object.assign(new AdminOrderEntity(), {
            id: 42,
            state: ModelState.ACTIVE,
            isComplete: true,
            email: 'buyer@example.com',
            vk: 'buyer-vk',
            patterns: [Object.assign(new OrderPatternEntity(), {
                id: 31,
                sizes: [selectedSize],
                pattern,
                color: true,
                requiresPatternPurchase: true,
            })],
        });
        findOne = jest.fn().mockResolvedValue(order);
        service = new AdminOrderService(
            { getRepository: jest.fn().mockReturnValue({ findOne }) } as unknown as DataSourceService,
            {} as PatternOrdersService,
            {} as AdminOrderMailService,
        );
    });

    it('returns the requested order with full patterns and preserves the selected purchase options', async () => {
        const result = await service.getAdminOrderById(42);

        expect(result).toMatchObject({
            id: 42,
            email: 'buyer@example.com',
            vk: 'buyer-vk',
            isComplete: true,
            patterns: [{
                id: 31,
                color: true,
                requiresPatternPurchase: true,
                sizes: [{ id: 21, size: { id: 3, value: 36 } }],
                pattern: {
                    id: 7,
                    name: { ru: 'Волны', en: 'Waves' },
                    description: { ru: 'Описание', en: 'Description' },
                    basePrice: { ru: 100, en: 2 },
                    additionalPrice: { ru: 50, en: 1 },
                    colorPrice: { ru: 25, en: 0.5 },
                    hidden: true,
                    categories: [4, 8],
                    images: [{ id: 9, name: 'Preview', preview: 'preview.webp', full: 'full.webp' }],
                    color: { id: 10, name: 'Colors', path: 'colors.pdf' },
                    sizes: [
                        { id: 21, size: { id: 3, value: 36 }, cbb: 11, jbb: 12, pdf: 13, png: 14 },
                        { id: 22, size: { id: 5, value: 40 }, cbb: null, jbb: null, pdf: null, png: null },
                    ],
                },
            }],
        });
        expect(result.patterns[0].sizes).toHaveLength(1);
        expect(order.patterns[0].pattern.categories).toEqual([{ id: 4 }, { id: 8 }]);
        expect(order.patterns[0].pattern.sizes[0].cbb).toEqual({ id: 11 });
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 42, state: ModelState.ACTIVE },
            relations: {
                patterns: {
                    sizes: { size: true },
                    pattern: {
                        name: true,
                        description: true,
                        basePrice: true,
                        additionalPrice: true,
                        colorPrice: true,
                        images: true,
                        categories: true,
                        color: true,
                        sizes: { size: true, cbb: true, jbb: true, pdf: true, png: true },
                    },
                },
            },
        }));
    });

    it('returns an empty patterns array for an order without items', async () => {
        order.patterns = [];

        await expect(service.getAdminOrderById(42)).resolves.toMatchObject({ id: 42, patterns: [] });
    });

    it('preserves the order item if its pattern has been deleted', async () => {
        order.patterns[0].pattern = null;

        await expect(service.getAdminOrderById(42)).resolves.toMatchObject({
            patterns: [{ id: 31, pattern: null, sizes: [{ id: 21 }] }],
        });
    });

    it('returns the standard not-exist error when no active order matches the ID', async () => {
        findOne.mockResolvedValue(null);

        await expect(service.getAdminOrderById(999)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
    });
});


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
