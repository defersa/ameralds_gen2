import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../../core/guards/auth.guard';
import { OrderService } from '../../db/services/order/order.service';
import { UserOrdersController } from './orders.controller';

describe('personal order access', () => {
    let app: INestApplication;
    const getCompletedUserOrder = jest.fn();
    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [UserOrdersController], providers: [{ provide: OrderService, useValue: { getCompletedUserOrder } }],
        }).compile();
        app = module.createNestApplication();
        app.use((req, _res, next) => {
            if (req.headers['test-user']) req.user = { id: Number(req.headers['test-user']) };
            next();
        });
        app.useGlobalGuards(new AuthGuard(app.get(Reflector)));
        await app.listen(0, '127.0.0.1');
    });
    beforeEach(() => { jest.clearAllMocks(); getCompletedUserOrder.mockResolvedValue({ id: 17, patterns: [] }); });
    afterAll(async () => { await app.close(); });

    it('rejects anonymous requests before accessing an order', async () => {
        await request(app.getHttpServer()).get('/orders/17').expect(401);
        expect(getCompletedUserOrder).not.toHaveBeenCalled();
    });
    it('uses the authenticated user regardless of identifiers supplied by the client', async () => {
        await request(app.getHttpServer()).get('/orders/17?userId=999').set('test-user', '42').expect(200);
        expect(getCompletedUserOrder).toHaveBeenCalledWith({ id: 42 }, 17);
    });
});
