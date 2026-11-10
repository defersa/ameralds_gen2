import { ModelState } from '@am-back/db/abstract/abstract.model';
import { PrivateFileEntity } from '@am-back/db/entities/files/file.entity';
import { UserPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { SizeEntity } from '@am-back/db/entities/patterns/size.entity';
import { testService } from '../../../../test/feature-services';
import { UserPatternRepository } from '../pattern-grants/repositories/user-pattern.repository';
import { UserPatternService } from './user-pattern.service';


describe('effective pattern ownership and download access', () => {
    const findOwned = jest.fn();
    let service: UserPatternService;
    let owned: UserPatternEntity;
    let size: PatternSizeEntity;
    let color: PrivateFileEntity;
    let pdf: PrivateFileEntity;

    beforeEach(async () => {
        jest.resetAllMocks();
        pdf = Object.assign(new PrivateFileEntity(), {
            id: 90,
            name: 'size.pdf',
            path: '/private/size.pdf',
            state: ModelState.ACTIVE,
        });
        color = Object.assign(new PrivateFileEntity(), pdf, { id: 91, name: 'color.pdf' });
        size = Object.assign(new PatternSizeEntity(), {
            id: 21,
            state: ModelState.ACTIVE,
            size: Object.assign(new SizeEntity(), { id: 3, state: ModelState.ACTIVE }),
            pattern: Object.assign(new PatternEntity(), { id: 7, state: ModelState.ACTIVE }),
            pdf,
        });
        owned = Object.assign(new UserPatternEntity(), {
            id: 10,
            pattern: Object.assign(new PatternEntity(), { id: 7, state: ModelState.ACTIVE, color }),
            sizes: [size],
            color: true,
        });
        findOwned.mockResolvedValue([owned]);
        service = await testService(UserPatternService, [{
            provide: UserPatternRepository,
            useValue: { findOwned },
        }]);
    });

    it('returns only the purchased size file or the separately owned color', async () => {
        await expect(service.getPurchasedFile(42, 7, 90)).resolves.toEqual({ id: 90, name: 'size.pdf', path: '/private/size.pdf' });
        await expect(service.getPurchasedFile(42, 7, 91)).resolves.toMatchObject({ id: 91 });
        expect(findOwned).toHaveBeenCalledWith(42, undefined, 7);
        await expect(service.getPurchasedFile(42, 7, 999)).rejects.toMatchObject({ response: { code: 'NOT_EXIST', entity: 'file' } });
    });

    it('rejects users without effective ownership even when a file ID is known', async () => {
        findOwned.mockResolvedValue([]);
        await expect(service.getPurchasedFile(43, 7, 90)).rejects.toMatchObject({ status: 400 });
    });

    it('requires a color grant in addition to an owned size', async () => {
        owned.color = false;
        await expect(service.getPurchasedFile(42, 7, 91)).rejects.toMatchObject({ status: 400 });
        await expect(service.getPurchasedFile(42, 7, 90)).resolves.toMatchObject({ id: 90 });
    });

    it('retains color ownership but suspends its download when the last size is revoked', async () => {
        owned.sizes = [];
        await expect(service.getPurchasedFile(42, 7, 91)).rejects.toMatchObject({ status: 400 });
        await expect(service.getBoughtSelections(42, undefined)).resolves.toEqual([{ patternId: 7, sizeIds: [], color: true }]);
    });

    it.each(['size', 'definition', 'pattern', 'wrong pattern', 'file'] as const)('denies an unavailable or unrelated %s', async (target) => {
        if (target === 'size') {
            size.state = ModelState.INACTIVE;
        }

        if (target === 'definition') {
            size.size.state = ModelState.INACTIVE;
        }

        if (target === 'pattern') {
            size.pattern.state = ModelState.INACTIVE;
        }

        if (target === 'wrong pattern') {
            size.pattern.id = 8;
        }

        if (target === 'file') {
            pdf.state = ModelState.INACTIVE;
        }

        await expect(service.getPurchasedFile(42, 7, 90)).rejects.toMatchObject({ status: 400 });
    });
});
