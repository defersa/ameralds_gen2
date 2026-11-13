import { PaymentService } from '@am-back/db/service/payment/payment.service';
import { PaymentVerificationService } from '@am-back/db/service/payment/payment-verification.service';
import { AuthGuard } from '@am-back/core/guards/auth.guard';
import { type INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PaymentsController } from './payments.controller';


describe('order payment API', () => {
    let app: INestApplication;
    const createPayment = jest.fn();
    const getState = jest.fn();

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [
                { provide: PaymentVerificationService, useValue: { getState } },
                {
                    provide: PaymentService,
                    useValue: { createPayment },
                },
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
        jest.clearAllMocks();
        createPayment.mockResolvedValue({
            id: 1,
            orderId: 17,
            status: 'PENDING',
            amount: 12345,
            currency: 'RUB',
            confirmationUrl: 'https://pay.example.test/1',
        });
    });

    afterAll(async () => {
        await app.close();
    });

    it('rejects anonymous requests before calling the service', async () => {
        await request(app.getHttpServer())
            .post('/orders/17/payments')
            .send({ idempotencyKey: randomUUID() })
            .expect(401);
        expect(createPayment).not.toHaveBeenCalled();
    });

    it('uses the authenticated owner, returns HTTP 201 and passes only the normalized key', async () => {
        const key = randomUUID();

        await request(app.getHttpServer())
            .post('/orders/17/payments?userId=999')
            .set('test-user', '42')
            .send({ idempotencyKey: key.toUpperCase() })
            .expect(201);
        expect(createPayment).toHaveBeenCalledWith(42, 17, key);
    });

    it.each(['amount', 'userId', 'status', 'provider', 'returnUrl'])('rejects a client-supplied %s', async (field) => {
        await request(app.getHttpServer())
            .post('/orders/17/payments')
            .set('test-user', '42')
            .send({
                idempotencyKey: randomUUID(),
                [field]: 'untrusted',
            })
            .expect(400);
        expect(createPayment).not.toHaveBeenCalled();
    });

    it.each([{}, [], { idempotencyKey: 'invalid' }, { idempotencyKey: 17 }])(
        'rejects invalid input %j',
        async (body) => {
            await request(app.getHttpServer())
                .post('/orders/17/payments')
                .set('test-user', '42')
                .send(body)
                .expect(400);
            expect(createPayment).not.toHaveBeenCalled();
        },
    );

    it('rejects a malformed order ID before calling the service', async () => {
        await request(app.getHttpServer())
            .post('/orders/invalid/payments')
            .set('test-user', '42')
            .send({ idempotencyKey: randomUUID() })
            .expect(400);
        expect(createPayment).not.toHaveBeenCalled();
    });

    it('preserves safe provider errors and documents retry/conflict responses without mock control endpoints', async () => {
        createPayment.mockRejectedValueOnce(
            new ServiceUnavailableException({
                code: 'PAYMENT_UNAVAILABLE',
                entity: 'payment',
            }),
        );

        const response = await request(app.getHttpServer())
            .post('/orders/17/payments')
            .set('test-user', '42')
            .send({ idempotencyKey: randomUUID() })
            .expect(503);

        expect(response.body).toMatchObject({
            code: 'PAYMENT_UNAVAILABLE',
            entity: 'payment',
        });

        const schema = SwaggerModule.createDocument(
            app,
            new DocumentBuilder().setTitle('payments').setVersion('1').build(),
        );

        expect(Object.keys(schema.paths)).toEqual(['/orders/{id}/payment-state', '/orders/{id}/payments']);
        expect(schema.paths['/orders/{id}/payments'].post.responses).toHaveProperty('409');
        expect(schema.paths['/orders/{id}/payments'].post.responses).toHaveProperty('503');
    });

    it('protects state checks and uses the authenticated owner without caching', async () => {
        await request(app.getHttpServer()).get('/orders/17/payment-state').expect(401);
        expect(getState).not.toHaveBeenCalled();
        getState.mockResolvedValue({ orderId: 17, orderStatus: 'pending_payment' });
        await request(app.getHttpServer()).get('/orders/17/payment-state?userId=999')
            .set('test-user', '42').expect(200).expect('Cache-Control', 'no-store');
        expect(getState).toHaveBeenCalledWith(42, 17);
    });
});
