import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ApiOrdersProducer } from '@am-front/root/api-v2';
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
