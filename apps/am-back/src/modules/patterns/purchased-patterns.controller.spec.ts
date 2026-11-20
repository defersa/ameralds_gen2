import { AuthGuard } from '@am-back/core/guards/auth.guard';
import { PatternsService } from '@am-back/db/service/patterns/patterns.service';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PatternsController } from './patterns.controller';


describe('purchased patterns HTTP access and filters', () => {
    const paginatedPatterns = jest.fn();
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [PatternsController],
            providers: [{ provide: PatternsService, useValue: { paginatedPatterns } }],
        }).compile();

        app = module.createNestApplication();
        app.use((req, _res, next) => {
            if (req.headers['test-user']) {
                req.user = { id: Number(req.headers['test-user']) };
            }

            next();
        });
        app.useGlobalGuards(new AuthGuard(app.get(Reflector)));
        await app.listen(0, '127.0.0.1');
    });

    beforeEach(() => {
        paginatedPatterns.mockReset().mockResolvedValue({ page: 1, count: 0, items: [] });
    });

    afterAll(async () => {
        await app?.close();
    });

    it('rejects anonymous requests before reading purchases', async () => {
        await request(app.getHttpServer()).get('/patterns/purchased/1').expect(401);
        expect(paginatedPatterns).not.toHaveBeenCalled();
    });

    it('takes the owner from authentication and normalizes repeated filters', async () => {
        await request(app.getHttpServer())
            .get('/patterns/purchased/2?userId=99&sizes=3&sizes=5&categories=7&query=волны')
            .set('test-user', '42')
            .expect(200);

        expect(paginatedPatterns).toHaveBeenCalledWith(2, {
            sizes: [3, 5],
            categories: [7],
            query: 'волны',
        }, 42);
    });

    it.each(['sizes=abc', 'sizes=0', 'sizes=-1', 'sizes=1.5', 'sizes=', 'categories=9007199254740992', 'query=a&query=b'])(
        'rejects malformed filters (%s) before querying the catalogue', async (query) => {
            const response = await request(app.getHttpServer())
                .get(`/patterns/purchased/1?${query}`)
                .set('test-user', '42')
                .expect(400);

            expect(response.body.code).toBe('INVALID');
            expect(paginatedPatterns).not.toHaveBeenCalled();
        },
    );

    it('rejects a malformed page', async () => {
        await request(app.getHttpServer()).get('/patterns/purchased/abc').set('test-user', '42').expect(400);
        expect(paginatedPatterns).not.toHaveBeenCalled();
    });

    it('keeps the public catalogue available without authentication or an ownership filter', async () => {
        await request(app.getHttpServer()).get('/patterns/list/1').expect(200);
        expect(paginatedPatterns).toHaveBeenCalledWith(1, { sizes: [], categories: [], query: '' });
    });
});
