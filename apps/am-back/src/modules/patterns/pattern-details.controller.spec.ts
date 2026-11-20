import { ModelState } from '@am-back/db/abstract/abstract.model';
import { DataSourceService } from '@am-back/db/data-source.service';
import { PrivateFileEntity } from '@am-back/db/entities/files/file.entity';
import { PatternEntity } from '@am-back/db/entities/patterns/pattern.entity';
import { PatternSizeEntity } from '@am-back/db/entities/patterns/pattern-size.entity';
import { SizeEntity } from '@am-back/db/entities/patterns/size.entity';
import { CommonEntitiesService } from '@am-back/db/service/common-entities.service';
import { FilesService } from '@am-back/db/service/files.service';
import { ImagesService } from '@am-back/db/service/images.service';
import { CategoriesService } from '@am-back/db/service/patterns/categories.service';
import { PatternsSizeService } from '@am-back/db/service/patterns/pattern-sizes.service';
import { PatternsService } from '@am-back/db/service/patterns/patterns.service';
import { PatternCatalogRepository } from '@am-back/db/service/patterns/repositories/pattern-catalog.repository';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PatternsController } from './patterns.controller';


describe('pattern details HTTP contract', () => {
    const findOne = jest.fn();
    let app: INestApplication;
    let pattern: PatternEntity;
    let size: PatternSizeEntity;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [PatternsController],
            providers: [
                PatternsService,
                { provide: DataSourceService, useValue: { getRepository: () => ({ findOne }) } },
                { provide: CommonEntitiesService, useValue: {} },
                { provide: CategoriesService, useValue: {} },
                { provide: ImagesService, useValue: {} },
                { provide: FilesService, useValue: {} },
                { provide: PatternsSizeService, useValue: {} },
                { provide: PatternCatalogRepository, useValue: {} },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.listen(0, '127.0.0.1');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        const pdf = Object.assign(new PrivateFileEntity(), {
            id: 90,
            name: 'size.pdf',
            path: '/private/size.pdf',
            state: ModelState.ACTIVE,
        });

        size = Object.assign(new PatternSizeEntity(), {
            id: 21,
            state: ModelState.ACTIVE,
            size: Object.assign(new SizeEntity(), { id: 3, value: 36, state: ModelState.ACTIVE }),
            cbb: Object.assign(new PrivateFileEntity(), pdf, { id: 89, name: 'size.cbb' }),
            pdf,
            png: Object.assign(new PrivateFileEntity(), pdf, { id: 91, name: 'size.png' }),
        });
        pattern = Object.assign(new PatternEntity(), {
            id: 7,
            name: { ru: 'Волны' },
            description: { ru: 'Морская схема' },
            basePrice: { ru: 100 },
            additionalPrice: { ru: 10 },
            colorPrice: { ru: 20 },
            hidden: false,
            categories: [3, 5],
            images: [],
            sizes: [size],
            color: Object.assign(new PrivateFileEntity(), pdf, { id: 92, name: 'color.pdf' }),
        });
        findOne.mockResolvedValue(pattern);
    });

    afterAll(async () => {
        await app?.close();
    });

    it('returns numeric file IDs from real file entities so purchased download links are available', async () => {
        const response = await request(app.getHttpServer()).get('/patterns/7').expect(200);

        expect(response.body.sizes).toEqual([{
            id: 21,
            size: { id: 3, value: 36 },
            cbb: 89,
            pdf: 90,
            png: 91,
        }]);
        expect(response.body.categories).toEqual([3, 5]);
        expect(response.body.color).toEqual({ id: 92, name: 'color.pdf', path: '' });
        expect(JSON.stringify(response.body)).not.toContain('/private/');
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: '7', state: ModelState.ACTIVE },
            relations: expect.objectContaining({
                sizes: { cbb: true, pdf: true, png: true, size: true },
            }),
        }));
    });

    it('returns null for removed or inactive files and keeps the remaining download available', async () => {
        size.cbb = null;
        size.png.state = ModelState.INACTIVE;
        pattern.color.state = ModelState.INACTIVE;

        const response = await request(app.getHttpServer()).get('/patterns/7').expect(200);

        expect(response.body.sizes[0]).toMatchObject({ cbb: null, pdf: 90, png: null });
        expect(response.body.color).toBeNull();
    });

    it('excludes inactive sizes and inactive size definitions', async () => {
        pattern.sizes.push(
            Object.assign(new PatternSizeEntity(), size, { id: 22, state: ModelState.INACTIVE }),
            Object.assign(new PatternSizeEntity(), size, {
                id: 23,
                size: Object.assign(new SizeEntity(), { id: 4, value: 38, state: ModelState.INACTIVE }),
            }),
        );

        const response = await request(app.getHttpServer()).get('/patterns/7').expect(200);

        expect(response.body.sizes.map((item: { id: number }) => item.id)).toEqual([21]);
    });

    it('preserves the not-found error for unavailable patterns', async () => {
        findOne.mockResolvedValue(null);

        const response = await request(app.getHttpServer()).get('/patterns/7').expect(400);

        expect(response.body).toMatchObject({ code: 'NOT_EXIST' });
    });
});
