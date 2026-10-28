import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Readable } from 'stream';
import request from 'supertest';
import { AUTH_KEY, AuthGuard } from '../../core/guards/auth.guard';
import { RolesGuard } from '../../core/guards/role.guard';
import { PrivateFileEntity } from '../../db/entities/files/file.entity';
import { UserRole } from '../../db/entities/user.entity';
import { FilesService } from '../../db/services/files.service';
import { AdminOrderService } from '../../db/services/order/admin-order.service';
import { ApiEntityNames, ApiErrorCodes } from '../errors/errors.dto';
import { AdminCartController } from './admin-cart.controller';


describe('AdminCartController', () => {
    let app: INestApplication;
    let file: PrivateFileEntity;
    let getAdminOrderFile: jest.Mock;
    let getFileAsStream: jest.Mock;
    let completeOrder: jest.Mock;
    const content = Buffer.from('%PDF-1.7\nfile contents');

    beforeAll(async () => {
        getAdminOrderFile = jest.fn();
        getFileAsStream = jest.fn();
        completeOrder = jest.fn();
        const module = await Test.createTestingModule({
            controllers: [AdminCartController],
            providers: [
                { provide: AdminOrderService, useValue: { getAdminOrderFile, completeOrder } },
                { provide: FilesService, useValue: { getFileAsStream } },
            ],
        }).compile();
        app = module.createNestApplication();
        app.setGlobalPrefix('api');
        app.use((req, _res, next) => {
            if (req.headers['test-user-role']) {
                req.user = { role: req.headers['test-user-role'] };
            }

            next();
        });
        const reflector = app.get(Reflector);
        app.useGlobalGuards(new RolesGuard(reflector), new AuthGuard(reflector));
        await app.listen(0, '127.0.0.1');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        file = Object.assign(new PrivateFileEntity(), { id: 13, name: 'Схема 36.pdf' });
        getAdminOrderFile.mockImplementation(async () => file);
        getFileAsStream.mockImplementation(async () => Readable.from([content]));
        completeOrder.mockResolvedValue({ order: { id: 43, isComplete: false, patterns: [] }, price: { ru: 0, en: 0 } });
    });

    afterAll(async () => {
        await app.close();
    });

    it('explicitly requires authorization', () => {
        expect(Reflect.getMetadata(AUTH_KEY, AdminCartController.prototype.downloadOrderFile)).toBe(true);
    });

    it('denies anonymous requests before accessing the order or file', async () => {
        await request(app.getHttpServer()).get('/api/admin/cart/42/download/13').expect(HttpStatus.UNAUTHORIZED);

        expect(getAdminOrderFile).not.toHaveBeenCalled();
        expect(getFileAsStream).not.toHaveBeenCalled();
    });

    it('denies authenticated users without the admin role', async () => {
        await request(app.getHttpServer())
            .get('/api/admin/cart/42/download/13')
            .set('test-user-role', UserRole.COMMON)
            .expect(HttpStatus.FORBIDDEN);

        expect(getAdminOrderFile).not.toHaveBeenCalled();
        expect(getFileAsStream).not.toHaveBeenCalled();
    });

    it.each([
        ['Схема 36.pdf', 'application/pdf'],
        ['pattern.cbb', 'application/octet-stream'],
    ])('downloads %s as an attachment', async (name, contentType) => {
        file.name = name;

        const response = await request(app.getHttpServer())
            .get('/api/admin/cart/42/download/13')
            .set('test-user-role', UserRole.ADMIN)
            .expect(HttpStatus.OK);

        expect(response.headers['content-type']).toBe(contentType);
        expect(response.headers['content-disposition']).toBe(`attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
        expect(response.body).toEqual(content);
        expect(getAdminOrderFile).toHaveBeenCalledWith(42, 13);
        expect(getFileAsStream).toHaveBeenCalledWith(file);
    });

    it.each(['abc/download/13', '42/download/abc', '42/download/13.5'])('rejects invalid IDs: %s', async (path) => {
        await request(app.getHttpServer())
            .get(`/api/admin/cart/${path}`)
            .set('test-user-role', UserRole.ADMIN)
            .expect(HttpStatus.BAD_REQUEST);

        expect(getAdminOrderFile).not.toHaveBeenCalled();
        expect(getFileAsStream).not.toHaveBeenCalled();
    });

    it('does not open a file when order validation fails', async () => {
        const error = { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART };
        getAdminOrderFile.mockRejectedValue(new HttpException(error, HttpStatus.BAD_REQUEST));

        const response = await request(app.getHttpServer())
            .get('/api/admin/cart/999/download/13')
            .set('test-user-role', UserRole.ADMIN)
            .expect(HttpStatus.BAD_REQUEST);

        expect(response.body).toEqual(error);
        expect(getFileAsStream).not.toHaveBeenCalled();
    });

    it('returns a file error if the physical file is missing', async () => {
        const error = { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE };
        getFileAsStream.mockRejectedValue(new HttpException(error, HttpStatus.BAD_REQUEST));

        const response = await request(app.getHttpServer())
            .get('/api/admin/cart/42/download/13')
            .set('test-user-role', UserRole.ADMIN)
            .expect(HttpStatus.BAD_REQUEST);

        expect(response.body).toEqual(error);
    });

    it('denies anonymous order completion before assigning purchases', async () => {
        await request(app.getHttpServer()).patch('/api/admin/cart/complete')
            .send({ email: 'buyer@example.com' }).expect(HttpStatus.UNAUTHORIZED);

        expect(completeOrder).not.toHaveBeenCalled();
    });

    it('denies order completion by a common user before assigning purchases', async () => {
        await request(app.getHttpServer()).patch('/api/admin/cart/complete')
            .set('test-user-role', UserRole.COMMON)
            .send({ email: 'buyer@example.com' }).expect(HttpStatus.FORBIDDEN);

        expect(completeOrder).not.toHaveBeenCalled();
    });

    it('allows an administrator to complete an order for an email', async () => {
        await request(app.getHttpServer()).patch('/api/admin/cart/complete')
            .set('test-user-role', UserRole.ADMIN)
            .send({ email: 'buyer@example.com' }).expect(HttpStatus.OK);

        expect(completeOrder).toHaveBeenCalledWith({ email: 'buyer@example.com' });
    });
});
