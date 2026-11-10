import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiOrdersProducer } from '@am-front/root/api-v2';
import { UserCartService } from './sources/user-cart.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { AuthService } from '@am-front/services/auth.service';
import { of, Subject, throwError } from 'rxjs';
import { CheckoutService } from './checkout.service';


describe('CheckoutService retry persistence', () => {
    const input = { cartId: 17, cartRevision: 'a'.repeat(64), currency: 'RUB' as const };
    const auth = signal(true);
    const place = jest.fn();
    const refreshCart = jest.fn();

    beforeEach(() => {
        sessionStorage.clear();
        auth.set(true);
        refreshCart.mockReset().mockReturnValue(of({}));
        place.mockReset().mockReturnValue(of({ id: 17 }));
        TestBed.configureTestingModule({ providers: [
            { provide: AuthService, useValue: { auth } },
            { provide: UserCartService, useValue: { refreshCart } },
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

    it('does not issue checkout when logged out and clears the previous attempt', () => {
        const service = TestBed.inject(CheckoutService);

        service.place(input).subscribe();
        expect(service.attempt()).toBeNull();
        auth.set(false);
        TestBed.tick();
        expect(service.attempt()).toBeNull();
        service.place(input).subscribe({ error: () => undefined });
        expect(place).toHaveBeenCalledTimes(1);
    });
    it('waits for the actual new cart before reporting success and clears the retry attempt', () => {
        const refreshed = new Subject<unknown>();

        refreshCart.mockReturnValue(refreshed);

        const service = TestBed.inject(CheckoutService);
        const next = jest.fn();

        service.place(input).subscribe(next);
        expect(next).not.toHaveBeenCalled();
        expect(service.attempt()).toEqual(input);
        refreshed.next({});
        refreshed.complete();
        expect(next).toHaveBeenCalledWith({ id: 17 });
        expect(service.attempt()).toBeNull();
    });

    it('retains the original attempt when refreshing the cart fails after checkout', () => {
        refreshCart.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

        const service = TestBed.inject(CheckoutService);
        const next = jest.fn();

        service.place(input).subscribe({ next, error: () => undefined });
        expect(next).not.toHaveBeenCalled();
        expect(service.attempt()).toEqual(input);
        service.place(input).subscribe(next);
        expect(place).toHaveBeenNthCalledWith(2, input);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('replaces the displayed cart and its price with the actual new empty cart', () => {
        const actualCart = jest.fn()
            .mockReturnValueOnce(of({
                revision: 'a'.repeat(64),
                price: { ru: 123, en: 2 },
                cart: { id: 17, patterns: [{ pattern: { id: 7 }, sizes: [{ size: { id: 1 } }], color: false }] },
            }))
            .mockReturnValue(of({
                revision: 'b'.repeat(64),
                price: { ru: 0, en: 0 },
                cart: { id: 18, patterns: [] },
            }));

        TestBed.overrideProvider(ApiOrdersProducer, { useValue: {
            checkoutControllerPlace: place,
            ordersControllerCart: actualCart,
            ordersControllerRemoveItemFromCart: jest.fn(),
            ordersControllerMergeLocalCart: jest.fn(),
        } });
        TestBed.overrideProvider(UserCartService, { useFactory: () => new UserCartService() });
        TestBed.overrideProvider(SnackService, { useValue: { open: jest.fn(), warn: jest.fn() } });

        const cart = TestBed.inject(UserCartService);
        const service = TestBed.inject(CheckoutService);

        TestBed.tick();
        expect(cart.cart()).toHaveLength(1);
        service.place(input).subscribe();
        expect(cart.cart()).toEqual([]);
        expect(cart.price()).toEqual({ ru: 0, en: 0 });
        expect(cart.checkoutSelection().cartId).toBe(18);
        expect(service.attempt()).toBeNull();
    });

});
