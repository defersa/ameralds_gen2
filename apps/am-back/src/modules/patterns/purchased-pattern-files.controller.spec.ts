import { AuthGuard } from '@am-back/core/guards/auth.guard';
import { FilesService } from '@am-back/db/service/files.service';
import { UserPatternService } from '@am-back/db/service/general/user-pattern.service';
import { BadRequestException, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import request from 'supertest';
import { PurchasedPatternFilesController } from './purchased-pattern-files.controller';


describe('purchased pattern downloads HTTP access', () => {
    const getPurchasedFile = jest.fn();
    const getFileAsStream = jest.fn();
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [PurchasedPatternFilesController],
            providers: [
                { provide: UserPatternService, useValue: { getPurchasedFile } },
                { provide: FilesService, useValue: { getFileAsStream } },
            ],
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
        jest.resetAllMocks();
        getPurchasedFile.mockResolvedValue({ id: 90, name: "Схема (36)'.pdf", path: '/private/size.pdf' });
        getFileAsStream.mockImplementation(async () => Readable.from(Buffer.from('%PDF-test')));
    });

    afterAll(async () => {
        await app?.close();
    });

    it('rejects anonymous access before reading ownership or opening a file', async () => {
        await request(app.getHttpServer()).get('/patterns/7/download/90').expect(401);
        expect(getPurchasedFile).not.toHaveBeenCalled();
        expect(getFileAsStream).not.toHaveBeenCalled();
    });

    it('uses the authenticated owner and streams an attachment without exposing its private path', async () => {
        const response = await request(app.getHttpServer())
            .get('/patterns/7/download/90?userId=999')
            .set('test-user', '42')
            .expect(200)
            .expect('Content-Type', 'application/pdf');

        expect(getPurchasedFile).toHaveBeenCalledWith(42, 7, 90);
        expect(response.headers['content-disposition']).toBe("attachment; filename*=UTF-8''%D0%A1%D1%85%D0%B5%D0%BC%D0%B0%20%2836%29%27.pdf");
        expect(response.body.toString()).toBe('%PDF-test');
    });

    it.each(['abc/download/90', '7/download/90.5'])('rejects malformed identifiers (%s)', async (path) => {
        await request(app.getHttpServer()).get(`/patterns/${path}`).set('test-user', '42').expect(400);
        expect(getPurchasedFile).not.toHaveBeenCalled();
    });

    it('does not open a file when rights have been revoked or the resource belongs to another user', async () => {
        getPurchasedFile.mockRejectedValue(new BadRequestException({ code: 'NOT_EXIST', entity: 'file' }));
        await request(app.getHttpServer()).get('/patterns/7/download/90').set('test-user', '43').expect(400);
        expect(getFileAsStream).not.toHaveBeenCalled();
    });
});
