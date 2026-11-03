import { ConflictException, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RolesGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../db/entities/user.entity';
import { AppSettingsService } from '../../db/services/app-settings/app-settings.service';
import { AppSettingsController } from './app-settings.controller';

describe('admin AppSettings API', () => {
    let app: INestApplication;
    const settings = { current: jest.fn(), history: jest.fn(), version: jest.fn(), createVersion: jest.fn() };
    const row = { version: 3, createdAt: new Date('2026-11-01T10:00:00Z'), snapshot: { unknown: false },
        createdBy: { id: 42, username: 'Admin', email: 'admin@example.com', passwordHash: 'private', access: ['private-token'] } };
    const body = { expectedVersion: 3, changes: { orders: { paymentExpirationDays: 14 } } };

    beforeAll(async () => {
        const module = await Test.createTestingModule({ controllers: [AppSettingsController], providers: [
            { provide: AppSettingsService, useValue: settings },
        ] }).compile();
        app = module.createNestApplication();
        app.setGlobalPrefix('api');
        app.use((req, _res, next) => {
            if (req.headers['test-user-role']) req.user = { id: 42, role: req.headers['test-user-role'] };
            next();
        });
        const reflector = app.get(Reflector);
        app.useGlobalGuards(new RolesGuard(reflector), new AuthGuard(reflector));
        await app.listen(0, '127.0.0.1');
    });
    afterAll(async () => { await app.close(); });
    beforeEach(() => {
        jest.clearAllMocks();
        settings.current.mockResolvedValue(row);
        settings.version.mockResolvedValue(row);
        settings.createVersion.mockResolvedValue({ ...row, version: 4 });
        settings.history.mockResolvedValue({ page: 2, count: 3, total: 23, activeVersion: 23, items: [row] });
    });

    it.each([['get', ''], ['get', '/list/1'], ['get', '/3'], ['post', '']])('protects %s %s from anonymous and common users', async (method, path) => {
        for (const [role, status] of [[undefined, 401], [UserRole.COMMON, 403]] as const) {
            const operation = request(app.getHttpServer())[method](`/api/admin/app-settings${path}`);
            if (role) operation.set('test-user-role', role);
            if (method === 'post') operation.send(body);
            await operation.expect(status);
        }
        for (const method of Object.values(settings)) expect(method).not.toHaveBeenCalled();
    });

    it('returns defaults, immutable snapshot and only public author fields', async () => {
        const response = await request(app.getHttpServer()).get('/api/admin/app-settings').set('test-user-role', UserRole.ADMIN).expect(200);
        expect(response.body).toEqual({
            version: 3, createdAt: row.createdAt.toISOString(), snapshot: { unknown: false },
            createdBy: { id: 42, username: 'Admin', email: 'admin@example.com' }, effective: { orders: { paymentExpirationDays: 7 } },
        });
        expect(JSON.stringify(response.body)).not.toContain('private');
    });

    it('returns page metadata and read-only version details', async () => {
        const response = await request(app.getHttpServer()).get('/api/admin/app-settings/list/2').set('test-user-role', UserRole.ADMIN).expect(200);
        expect(settings.history).toHaveBeenCalledWith(2);
        expect(response.body).toMatchObject({ page: 2, count: 3, total: 23, activeVersion: 23, items: [{ version: 3 }] });
        await request(app.getHttpServer()).get('/api/admin/app-settings/3').set('test-user-role', UserRole.ADMIN).expect(200);
        expect(settings.version).toHaveBeenCalledWith(3);
    });

    it('creates a new version using the verified request user', async () => {
        settings.version.mockResolvedValue({ ...row, version: 4, snapshot: { orders: { paymentExpirationDays: 14 } } });
        const response = await request(app.getHttpServer()).post('/api/admin/app-settings').set('test-user-role', UserRole.ADMIN).send(body).expect(201);
        expect(settings.createVersion).toHaveBeenCalledWith(3, body.changes, 42);
        expect(response.body).toMatchObject({ version: 4, effective: { orders: { paymentExpirationDays: 14 } } });
    });

    it.each([{}, { ...body, createdById: 99 }, { ...body, expectedVersion: '3' }, { ...body, expectedVersion: 0 },
        { ...body, expectedVersion: 1.5 }, { ...body, changes: {} }, { ...body, changes: { secret: 'token' } },
        ...[null, false, '7', 0, -1, 366, 1.5].map(value => ({ ...body, changes: { orders: { paymentExpirationDays: value } } })),
        { ...body, changes: { orders: { paymentExpirationDays: 7, secret: 'token' } } },
    ])('rejects invalid data and unknown/secret fields: %j', async invalid => {
        const response = await request(app.getHttpServer()).post('/api/admin/app-settings').set('test-user-role', UserRole.ADMIN).send(invalid).expect(400);
        expect(response.body).toEqual({ code: 'INVALID', entity: 'appSettings' });
        expect(settings.createVersion).not.toHaveBeenCalled();
    });

    it('returns a structured conflict without silently retrying with a newer version', async () => {
        settings.createVersion.mockRejectedValue(new ConflictException({ code: 'VERSION_CONFLICT', entity: 'appSettings' }));
        const response = await request(app.getHttpServer()).post('/api/admin/app-settings').set('test-user-role', UserRole.ADMIN).send(body).expect(409);
        expect(response.body).toEqual({ code: 'VERSION_CONFLICT', entity: 'appSettings' });
        expect(settings.createVersion).toHaveBeenCalledTimes(1);
    });

    it.each(['/list/not-a-number', '/list/1.5', '/not-a-number'])('rejects invalid route parameters: %s', async path => {
        await request(app.getHttpServer()).get(`/api/admin/app-settings${path}`).set('test-user-role', UserRole.ADMIN).expect(400);
        expect(settings.history).not.toHaveBeenCalled();
        expect(settings.version).not.toHaveBeenCalled();
    });

    it.each(['patch', 'delete'])('does not provide %s for old versions', async method => {
        await request(app.getHttpServer())[method]('/api/admin/app-settings/3').set('test-user-role', UserRole.ADMIN).expect(404);
    });
});
