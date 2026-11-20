import { DEFAULT_PAGE_SIZE, MAX_PAGE_NUMBER } from '@ameralds/utils';
import { DataSourceService } from '@am-back/db/data-source.service';
import { CommonEntitiesService } from '@am-back/db/service/common-entities.service';
import { FilesService } from '@am-back/db/service/files.service';
import { ImagesService } from '@am-back/db/service/images.service';
import { Test } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PatternsSizeService } from './pattern-sizes.service';
import { PatternsService } from './patterns.service';
import { PatternCatalogRepository } from './repositories/pattern-catalog.repository';


describe('pattern page pagination', () => {
    const findPageIds = jest.fn();
    const countFiltered = jest.fn();
    const findPageByIds = jest.fn();
    const filters = { sizes: [], categories: [], query: '' };
    let service: PatternsService;

    beforeEach(async () => {
        jest.resetAllMocks();
        findPageIds.mockResolvedValue([]);
        countFiltered.mockResolvedValue(0);
        findPageByIds.mockResolvedValue([]);

        const module = await Test.createTestingModule({
            providers: [
                PatternsService,
                { provide: DataSourceService, useValue: { getRepository: jest.fn() } },
                { provide: CommonEntitiesService, useValue: {} },
                { provide: CategoriesService, useValue: {} },
                { provide: ImagesService, useValue: {} },
                { provide: FilesService, useValue: {} },
                { provide: PatternsSizeService, useValue: {} },
                { provide: PatternCatalogRepository, useValue: { findPageIds, countFiltered, findPageByIds } },
            ],
        }).compile();

        service = module.get(PatternsService);
    });

    it.each([0, -1, 1.5, NaN, Infinity, MAX_PAGE_NUMBER + 1])('rejects an invalid page (%s) before querying', async page => {
        await expect(service.paginatedPatterns(page, filters, 42)).rejects.toMatchObject({ status: 400 });
        expect(findPageIds).not.toHaveBeenCalled();
    });

    it('paginates the owner selection and calculates page count from unique patterns', async () => {
        countFiltered.mockResolvedValue(DEFAULT_PAGE_SIZE + 1);
        await expect(service.paginatedPatterns(2, filters, 42)).resolves.toEqual({ page: 2, count: 2, items: [] });
        expect(findPageIds).toHaveBeenCalledWith(filters, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE, 42);
        expect(countFiltered).toHaveBeenCalledWith(filters, 42);
        expect(findPageByIds).toHaveBeenCalledWith([], 42);
    });

    it('returns an empty page for a user without purchases', async () => {
        await expect(service.paginatedPatterns(1, filters, 42)).resolves.toEqual({ page: 1, count: 0, items: [] });
    });
});
