import { signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ApiOrdersProducer, EnumPaymentStatus, PaymentAttemptDto } from '@am-front/root/api-v2';
import { AuthService } from './auth.service';
import { UserOrdersService } from './user-orders.service';


describe('UserOrdersService.cancelOrder', () => {
    const authenticated = signal(true);
    const cancel = jest.fn();
    let service: UserOrdersService;

    beforeEach(() => {
        jest.clearAllMocks();
        authenticated.set(true);
        cancel.mockReturnValue(of({ id: 17, status: 'cancel' }));

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: { auth: authenticated },
                },
                {
                    provide: ApiOrdersProducer,
                    useValue: { userOrdersControllerCancelOrder: cancel },
                },
            ],
        });

        service = TestBed.inject(UserOrdersService);
    });

    it('uses the generated endpoint', async () => {
        await expect(firstValueFrom(service.cancelOrder(17))).resolves.toMatchObject({
            id: 17,
            status: 'cancel',
        });
        expect(cancel).toHaveBeenCalledWith(17);
    });

    it('checks authentication when subscribing and does not send a request after logout', async () => {
        const request = service.cancelOrder(17);

        authenticated.set(false);

        await expect(firstValueFrom(request)).rejects.toMatchObject({ status: 401 });
        expect(cancel).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid ID %s without an HTTP request', async id => {
        await expect(firstValueFrom(service.cancelOrder(id))).rejects.toMatchObject({ status: 400 });
        expect(cancel).not.toHaveBeenCalled();
    });
});

describe('UserOrdersService payments', () => {
    const authenticated = signal(true);
    const create = jest.fn();
    const assign = jest.fn();
    const key = 'c5d5817f-1f33-4e1a-9a25-126745a79f98';
    let service: UserOrdersService;

    const attempt = {
        id: 1,
        orderId: 17,
        status: EnumPaymentStatus.PENDING,
        amount: 12345,
        currency: 'RUB',
        confirmationUrl: 'https://pay.example.test/1',
        createdAt: new Date(),
        paidAt: null,
        testMode: true,
    } satisfies PaymentAttemptDto;

    beforeEach(() => {
        jest.clearAllMocks();
        authenticated.set(true);
        create.mockReturnValue(of(attempt));
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { auth: authenticated } },
                { provide: ApiOrdersProducer, useValue: { paymentsControllerCreatePayment: create } },
                { provide: DOCUMENT, useValue: { location: { origin: 'http://localhost:4400', assign } } },
            ],
        });
        service = TestBed.inject(UserOrdersService);
    });

    it('uses the generated endpoint and sends only an order ID and an idempotency key', async () => {
        await expect(firstValueFrom(service.createPayment(17, key))).resolves.toEqual(attempt);
        expect(create).toHaveBeenCalledWith(17, { idempotencyKey: key });
    });

    it('checks authentication at subscription time', async () => {
        const request = service.createPayment(17, key);

        authenticated.set(false);

        await expect(firstValueFrom(request)).rejects.toMatchObject({ status: 401 });
        expect(create).not.toHaveBeenCalled();
        expect(service.redirectToPayment(attempt)).toBe(false);
        expect(assign).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid payment order ID %s', async id => {
        await expect(firstValueFrom(service.createPayment(id, key))).rejects.toMatchObject({ status: 400 });
        expect(create).not.toHaveBeenCalled();
    });

    it('rejects an invalid UUID without sending a request', async () => {
        await expect(firstValueFrom(service.createPayment(17, 'invalid'))).rejects.toMatchObject({ status: 400 });
        expect(create).not.toHaveBeenCalled();
    });

    it('redirects pending payments without changing their status', () => {
        expect(service.redirectToPayment(attempt)).toBe(true);
        expect(assign).toHaveBeenCalledWith(attempt.confirmationUrl);
        expect(attempt.status).toBe(EnumPaymentStatus.PENDING);
    });

    it.each(['javascript:alert(1)', 'data:text/html,test', 'invalid', 'http://external.example.test', 'https://user:secret@pay.example.test'])('rejects unsafe confirmation URL %s', confirmationUrl => {
        expect(service.redirectToPayment({ ...attempt, confirmationUrl })).toBe(false);
        expect(assign).not.toHaveBeenCalled();
    });

    it.each([EnumPaymentStatus.SUCCEEDED, EnumPaymentStatus.FAILED, EnumPaymentStatus.CANCELLED])('does not redirect terminal status %s', status => {
        expect(service.redirectToPayment({ ...attempt, status })).toBe(false);
        expect(assign).not.toHaveBeenCalled();
    });
});
