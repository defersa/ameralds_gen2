import { HttpStatus } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { PrivateFileEntity } from '../../entities/files/file.entity';
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
                    pdf: { id: 13 },
                    png: { id: 14 },
                }),
                Object.assign(new PatternSizeEntity(), {
                    id: 22,
                    size: { id: 5, value: 40 },
                    cbb: null,
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
                        { id: 21, size: { id: 3, value: 36 }, cbb: 11, pdf: 13, png: 14 },
                        { id: 22, size: { id: 5, value: 40 }, cbb: null, pdf: null, png: null },
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
                        sizes: { size: true, cbb: true, pdf: true, png: true },
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


describe('AdminOrderService.getAdminOrderFile', () => {
    let service: AdminOrderService;
    let order: AdminOrderEntity;
    let selectedSize: PatternSizeEntity;
    let findOne: jest.Mock;

    beforeEach(() => {
        const file = (id: number, extension: string) => Object.assign(new PrivateFileEntity(), {
            id,
            state: ModelState.ACTIVE,
            name: `pattern.${extension}`,
            path: `/private/pattern.${extension}`,
        });
        selectedSize = Object.assign(new PatternSizeEntity(), {
            id: 21,
            state: ModelState.ACTIVE,
            cbb: file(11, 'cbb'),
            pdf: file(13, 'pdf'),
            png: file(14, 'png'),
        });
        order = Object.assign(new AdminOrderEntity(), {
            id: 42,
            state: ModelState.ACTIVE,
            isComplete: true,
            patterns: [Object.assign(new OrderPatternEntity(), {
                id: 31,
                state: ModelState.ACTIVE,
                sizes: [selectedSize],
                pattern: Object.assign(new PatternEntity(), {
                    sizes: [selectedSize, Object.assign(new PatternSizeEntity(), {
                        id: 22,
                        state: ModelState.ACTIVE,
                        cbb: file(15, 'cbb'),
                        pdf: file(16, 'pdf'),
                    })],
                }),
            })],
        });
        findOne = jest.fn().mockResolvedValue(order);
        service = new AdminOrderService(
            { getRepository: jest.fn().mockReturnValue({ findOne }) } as unknown as DataSourceService,
            {} as PatternOrdersService,
            {} as AdminOrderMailService,
        );
    });

    it.each(['cbb', 'pdf'] as const)('allows the selected size %s file from a completed order', async (format) => {
        const file = selectedSize[format];

        await expect(service.getAdminOrderFile(42, file.id)).resolves.toBe(file);
        expect(findOne).toHaveBeenCalledWith({
            where: { id: 42, state: ModelState.ACTIVE },
            relations: { patterns: { sizes: { cbb: true, pdf: true } } },
        });
    });

    it('rejects a missing or inactive order', async () => {
        findOne.mockResolvedValue(null);

        await expect(service.getAdminOrderFile(999, 13)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
    });

    it('rejects an incomplete order even if it contains the requested file', async () => {
        order.isComplete = false;

        await expect(service.getAdminOrderFile(42, 13)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART },
        });
    });

    it.each([
        ['an unrelated file', 12],
        ['PNG', 14],
        ['CBB from an unselected size', 15],
        ['PDF from an unselected size', 16],
        ['a file from another order', 99],
    ])('rejects %s', async (_description, fileId: number) => {
        await expect(service.getAdminOrderFile(42, fileId)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
        });
    });

    it.each(['item', 'size', 'file'])('rejects an inactive %s', async (entity) => {
        if (entity === 'item') {
            order.patterns[0].state = ModelState.INACTIVE;
        } else if (entity === 'size') {
            selectedSize.state = ModelState.INACTIVE;
        } else {
            selectedSize.pdf.state = ModelState.INACTIVE;
        }

        await expect(service.getAdminOrderFile(42, 13)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
        });
    });

    it('rejects a missing file relation', async () => {
        selectedSize.pdf = null;

        await expect(service.getAdminOrderFile(42, 13)).rejects.toMatchObject({
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
        });
    });

    it('rejects a file when the order has no items', async () => {
        order.patterns = [];

        await expect(service.getAdminOrderFile(42, 13)).rejects.toMatchObject({
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
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


describe('AdminOrderService.clearCart', () => {
    it('waits for every item to be deleted before saving the empty cart', async () => {
        let finishRemoval: () => void;
        let startRemoval: () => void;
        const removal = new Promise<void>((resolve) => { finishRemoval = resolve; });
        const removalStarted = new Promise<void>((resolve) => { startRemoval = resolve; });
        const order = Object.assign(new AdminOrderEntity(), {
            id: 10,
            isComplete: false,
            patterns: [Object.assign(new OrderPatternEntity(), { id: 31 })],
        });
        const repository = {
            findOne: jest.fn().mockResolvedValue(order),
            save: jest.fn().mockResolvedValue(order),
        };
        const removeOrderPatter = jest.fn().mockImplementation(() => {
            startRemoval();

            return removal;
        });
        const service = new AdminOrderService(
            { getRepository: jest.fn().mockReturnValue(repository) } as unknown as DataSourceService,
            { removeOrderPatter } as unknown as PatternOrdersService,
            {} as AdminOrderMailService,
        );
        const clearing = service.clearCart();
        await removalStarted;

        expect(removeOrderPatter).toHaveBeenCalledWith(order.patterns[0]);
        expect(repository.save).not.toHaveBeenCalled();

        finishRemoval();
        await clearing;

        expect(order.patterns).toEqual([]);
        expect(repository.save).toHaveBeenCalledWith(order);
    });
});


describe('AdminOrderService.resendOrderEmail', () => {
    let service: AdminOrderService;
    let order: AdminOrderEntity;
    let repository: {
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
    };
    let sendCompletedOrder: jest.Mock;

    beforeEach(() => {
        order = Object.assign(new AdminOrderEntity(), {
            id: 42,
            state: ModelState.ACTIVE,
            isComplete: true,
            email: 'buyer@example.com',
            vk: 'buyer-vk',
            patterns: [Object.assign(new OrderPatternEntity(), { id: 31 })],
        });
        repository = {
            findOne: jest.fn().mockResolvedValue(order),
            create: jest.fn(),
            save: jest.fn(),
        };
        sendCompletedOrder = jest.fn().mockResolvedValue(undefined);
        service = new AdminOrderService(
            { getRepository: jest.fn().mockReturnValue(repository) } as unknown as DataSourceService,
            {} as PatternOrdersService,
            { sendCompletedOrder } as unknown as AdminOrderMailService,
        );
    });

    it('resends the saved order without changing it or opening a new cart', async () => {
        const originalOrder = { ...order };

        await expect(service.resendOrderEmail(42)).resolves.toBeUndefined();

        expect(sendCompletedOrder).toHaveBeenCalledTimes(1);
        expect(sendCompletedOrder).toHaveBeenCalledWith(order);
        expect(order).toEqual(originalOrder);
        expect(repository.save).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a missing or inactive order without sending mail', async () => {
        repository.findOne.mockResolvedValue(null);

        await expect(service.resendOrderEmail(999)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
        });
        expect(repository.findOne).toHaveBeenCalledWith({
            where: { id: 999, state: ModelState.ACTIVE },
        });
        expect(sendCompletedOrder).not.toHaveBeenCalled();
    });

    it('rejects an incomplete order without sending mail', async () => {
        order.isComplete = false;

        await expect(service.resendOrderEmail(42)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART },
        });
        expect(sendCompletedOrder).not.toHaveBeenCalled();
    });

    it.each([undefined, null, '', '   '])('rejects an order without a recipient (%s)', async (email) => {
        order.email = email;

        await expect(service.resendOrderEmail(42)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.INVALID_EMAIL, entity: ApiEntityNames.CART },
        });
        expect(sendCompletedOrder).not.toHaveBeenCalled();
    });

    it('propagates mail errors so the caller can retry without changing the order', async () => {
        const error = new Error('SMTP unavailable');
        sendCompletedOrder.mockRejectedValue(error);

        await expect(service.resendOrderEmail(42)).rejects.toThrow(error);

        expect(order.isComplete).toBe(true);
        expect(repository.save).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
    });
});
