import { type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '@am-back/core/guards/auth.guard';
import { RolesGuard } from '@am-back/core/guards/role.guard';
import { AdminPlacedOrdersService } from '@am-back/db/service/order/admin/admin-placed-orders.service';
import { AdminPlacedOrderActionsService } from '@am-back/db/service/order/admin/admin-placed-order-actions.service';
import { AdminPlacedOrdersController } from './admin-placed-orders.controller';


describe('administrative placed order API', () => {
    let app: INestApplication;
    const orders = {
        list: jest.fn(),
        details: jest.fn(),
    };
    const actions = {
        cancel: jest.fn(),
        refund: jest.fn(),
    };

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [AdminPlacedOrdersController],
            providers: [
                {
                    provide: AdminPlacedOrdersService,
                    useValue: orders,
                },
                {
                    provide: AdminPlacedOrderActionsService,
                    useValue: actions,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        app.use((req, _res, next) => {
            if (req.headers['test-role']) {
                req.user = {
                    id: 42,
                    role: req.headers['test-role'],
                };
            }

            next();
        });
        app.useGlobalGuards(new AuthGuard(app.get(Reflector)), new RolesGuard(app.get(Reflector)));
        await app.listen(0, '127.0.0.1');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        actions.cancel.mockResolvedValue({
            id: 7,
            status: 'cancel',
        });
        actions.refund.mockResolvedValue({
            id: 7,
            status: 'success',
            refunds: [{ status: 'accepted' }],
        });
    });

    afterAll(async () => {
        await app.close();
    });

    it.each(['', '/7', '/7/cancel', '/7/refund'])('rejects anonymous and common users at %s', async (path) => {
        for (const role of ['', 'common']) {
            const call =
                path.endsWith('cancel') || path.endsWith('refund')
                    ? request(app.getHttpServer()).post(`/admin/orders${path}`).send({ reason: 'Причина' })
                    : request(app.getHttpServer()).get(`/admin/orders${path}`);

            if (role) {
                call.set('test-role', role);
            }

            await call.expect(role ? 403 : 401);
        }

        expect(orders.list).not.toHaveBeenCalled();
        expect(orders.details).not.toHaveBeenCalled();
        expect(actions.cancel).not.toHaveBeenCalled();
        expect(actions.refund).not.toHaveBeenCalled();
    });

    it('combines statuses, user and inclusive UTC days with server pagination', async () => {
        orders.list.mockResolvedValue({
            items: [],
            count: 1,
            page: 2,
            pageSize: 10,
            total: 0,
        });
        await request(app.getHttpServer())
            .get('/admin/orders?page=2&pageSize=10&statuses=success,cancel&user=buyer&from=2026-11-01&to=2026-11-22')
            .set('test-role', 'admin')
            .expect(200);
        expect(orders.list).toHaveBeenCalledWith({
            page: 2,
            pageSize: 10,
            statuses: expect.arrayContaining(['success', 'cancel']),
            user: 'buyer',
            createdFrom: '2026-11-01T00:00:00.000Z',
            createdBefore: '2026-11-23T00:00:00.000Z',
        });
    });

    it.each([
        'page=0',
        'page=1.2',
        'page=2147483648',
        'pageSize=101',
        'pageSize=-1',
        'page=1&page=2',
        'statuses=open',
        'statuses=success,open',
        'statuses=invalid',
        'statuses=success&statuses=cancel',
        'from=2026-02-30',
        'to=invalid',
        'from=2026-11-22T00:00:00Z',
        'from=2026-11-23&to=2026-11-22',
        'user[]=a',
    ])('rejects invalid filters: %s', async (query) => {
        await request(app.getHttpServer()).get(`/admin/orders?${query}`).set('test-role', 'admin').expect(400);
        expect(orders.list).not.toHaveBeenCalled();
    });

    it.each(['cancel', 'refund'])('uses the authenticated administrator for %s', async (action) => {
        await request(app.getHttpServer())
            .post(`/admin/orders/7/${action}?actorId=999`)
            .set('test-role', 'admin')
            .send({ reason: ' Причина ' })
            .expect(200);
        expect(action === 'cancel' ? actions.cancel : actions.refund).toHaveBeenCalledWith(42, 7, 'Причина');
    });

    it.each([
        {},
        { reason: '  ' },
        {
            reason: 'x'.repeat(2001),
        },
        {
            reason: 'Возврат',
            amount: 1,
        },
        {
            reason: 'Возврат',
            itemIds: [1],
        },
        {
            reason: 'Возврат',
            actorId: 999,
        },
    ])('rejects incomplete or partial action bodies: %j', async (body) => {
        await request(app.getHttpServer())
            .post('/admin/orders/7/refund')
            .set('test-role', 'admin')
            .send(body)
            .expect(400);
        expect(actions.refund).not.toHaveBeenCalled();
    });

    it.each(['invalid', '0', '-1', '2147483648'])('rejects invalid ID %s before accessing a record', async id => {
        await request(app.getHttpServer()).get(`/admin/orders/${id}`).set('test-role', 'admin').expect(400);
        expect(orders.details).not.toHaveBeenCalled();
    });
});
