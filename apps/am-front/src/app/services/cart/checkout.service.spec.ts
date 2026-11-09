import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiOrdersProducer } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { of, throwError } from 'rxjs';
import { CheckoutService } from './checkout.service';


describe('CheckoutService retry persistence', () => {
    const input = { cartId: 17, cartRevision: 'a'.repeat(64), currency: 'RUB' as const };
    const auth = signal(true);
    const place = jest.fn();

    beforeEach(() => {
        sessionStorage.clear();
        auth.set(true);
        place.mockReset().mockReturnValue(of({ id: 17 }));
        TestBed.configureTestingModule({ providers: [
            { provide: AuthService, useValue: { auth } },
            { provide: ApiOrdersProducer, useValue: { checkoutControllerPlace: place } },
        ] });
    });

    it('retains the original attempt on a lost response and restores it after reload', () => {
        const service = TestBed.inject(CheckoutService);

        place.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
        service.place(input).subscribe({ error: () => undefined });
        expect(service.attempt()).toEqual(input);

        const restored = TestBed.runInInjectionContext(() => new CheckoutService());

        expect(restored.attempt()).toEqual(input);
        restored.place(restored.attempt()).subscribe();
        expect(place).toHaveBeenNthCalledWith(2, input);
    });

    it('does not issue checkout when logged out and clears the previous result', () => {
        const service = TestBed.inject(CheckoutService);

        service.place(input).subscribe();
        expect(service.result()).toEqual({ id: 17 });
        auth.set(false);
        TestBed.tick();
        expect(service.result()).toBeNull();
        expect(service.attempt()).toBeNull();
        service.place(input).subscribe({ error: () => undefined });
        expect(place).toHaveBeenCalledTimes(1);
    });
});
