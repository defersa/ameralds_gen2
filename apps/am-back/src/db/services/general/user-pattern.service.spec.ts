import type { EntityManager } from 'typeorm';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { OrderPatternEntity, UserPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { UserEntity } from '../../entities/user.entity';
import { UserPatternService } from './user-pattern.service';

describe('UserPatternService.addBoughtPatterns', () => {
    const user = Object.assign(new UserEntity(), { id: 42 });
    const pattern = Object.assign(new PatternEntity(), { id: 7, state: ModelState.ACTIVE });
    const size = (id: number) => Object.assign(new PatternSizeEntity(), { id, state: ModelState.ACTIVE });
    let service: UserPatternService;
    let manager: EntityManager;
    let bought: UserPatternEntity;
    let item: OrderPatternEntity;
    let repository: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

    beforeEach(() => {
        bought = Object.assign(new UserPatternEntity(), {
            id: 10, user, pattern, sizes: [size(21)], color: true, state: ModelState.ACTIVE,
            createdAt: new Date('2026-01-01'),
        });
        item = Object.assign(new OrderPatternEntity(), {
            id: 31, pattern, sizes: [size(21), size(22)], color: false, state: ModelState.ACTIVE,
        });
        repository = {
            find: jest.fn().mockResolvedValue([bought]),
            create: jest.fn(details => Object.assign(new UserPatternEntity(), details)),
            save: jest.fn(async entity => Object.assign(entity, { id: entity.id ?? 11 })),
        };
        manager = { getRepository: jest.fn().mockReturnValue(repository) } as unknown as EntityManager;
        service = new UserPatternService({ getRepository: jest.fn() } as unknown as DataSourceService);
    });

    it('adds missing sizes and preserves the purchased color and original purchase', async () => {
        const originalSize = bought.sizes[0];

        await service.addBoughtPatterns(user, [item], manager);

        expect(bought).toMatchObject({ id: 10, createdAt: new Date('2026-01-01'), color: true });
        expect(bought.sizes.map(size => size.id)).toEqual([21, 22]);
        expect(bought.sizes[0]).toBe(originalSize);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.save).toHaveBeenCalledWith(bought);
    });

    it('adds color without removing previously purchased sizes', async () => {
        bought.color = false;
        item.color = true;
        item.sizes = [size(22)];

        await service.addBoughtPatterns(user, [item], manager);

        expect(bought.color).toBe(true);
        expect(bought.sizes.map(size => size.id)).toEqual([21, 22]);
    });

    it('does not rewrite a purchase when all options are already owned', async () => {
        item.sizes = [size(21), size(21)];

        await service.addBoughtPatterns(user, [item, item], manager);

        expect(repository.save).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates one purchase for repeated items of a new pattern and combines their options', async () => {
        repository.find.mockResolvedValue([]);
        const secondItem = Object.assign(new OrderPatternEntity(), item, { sizes: [size(23)], color: true });

        await service.addBoughtPatterns(user, [item, secondItem], manager);

        expect(repository.create).toHaveBeenCalledTimes(1);
        const purchase = repository.save.mock.calls.at(-1)[0] as UserPatternEntity;
        expect(purchase).toMatchObject({ user, pattern, color: true });
        expect(purchase.sizes.map(size => size.id)).toEqual([21, 22, 23]);
    });

    it('keeps unrelated purchases intact', async () => {
        const other = Object.assign(new UserPatternEntity(), bought, {
            id: 12, pattern: Object.assign(new PatternEntity(), { id: 8 }), sizes: [size(25)],
        });
        repository.find.mockResolvedValue([bought, other]);
        const snapshot = { ...other };

        await service.addBoughtPatterns(user, [item], manager);

        expect(other).toEqual(snapshot);
        expect(repository.save).not.toHaveBeenCalledWith(other);
    });

    it.each(['item', 'pattern', 'deleted pattern'])('does not grant access for an unavailable %s', async entity => {
        if (entity === 'item') item.state = ModelState.INACTIVE;
        if (entity === 'pattern') item.pattern = Object.assign(new PatternEntity(), pattern, { state: ModelState.INACTIVE });
        if (entity === 'deleted pattern') item.pattern = null;

        await service.addBoughtPatterns(user, [item], manager);

        expect(repository.save).not.toHaveBeenCalled();
    });

    it('does not grant inactive sizes or discard previously owned sizes', async () => {
        item.sizes = [Object.assign(size(22), { state: ModelState.INACTIVE })];

        await service.addBoughtPatterns(user, [item], manager);

        expect(bought.sizes.map(size => size.id)).toEqual([21]);
        expect(repository.save).not.toHaveBeenCalled();
    });
});
