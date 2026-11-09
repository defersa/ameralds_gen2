import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CheckoutInputDto, CheckoutOrderDto, EnumCheckoutConflictReason, EnumOrderStatus } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { CheckoutService } from '@am-front/services/cart/checkout.service';
import { UserCartService } from '@am-front/services/cart/sources/user-cart.service';
import { LangService } from '@am-front/services/lang.service';
import { of, Subject, tap, throwError } from 'rxjs';
import { ActionAuthComponent } from './action-auth.component';


describe('checkout cart action', () => {
    const selection = { cartId: 17, cartRevision: 'a'.repeat(64) };
    const auth = signal(true);
    const attempt = signal<CheckoutInputDto | null>(null);
    const result = signal<CheckoutOrderDto | null>(null);
    const place = jest.fn();
    const refreshCart = jest.fn();
    const reset = jest.fn(() => { attempt.set(null); result.set(null); });
    let response: Subject<CheckoutOrderDto>;

    beforeEach(() => {
        auth.set(true);
        attempt.set(null);
        result.set(null);
        reset.mockClear();
        refreshCart.mockReset().mockReturnValue(of({}));
        response = new Subject();
        place.mockReset().mockImplementation((input: CheckoutInputDto) => {
            attempt.set(input);

            return response.pipe(tap((order) => result.set(order)));
        });
        TestBed.configureTestingModule({ imports: [ActionAuthComponent], providers: [
            { provide: AuthService, useValue: { auth } },
            { provide: CheckoutService, useValue: { place, attempt, result, reset } },
            { provide: UserCartService, useValue: {
                checkoutSelection: signal(selection), cart: signal([{ pattern: 7 }]), refreshCart,
            } },
            { provide: LangService, useValue: { lang: signal('ru') } },
        ] });
    });

    it('blocks a double click and shows the resulting order with its frozen deadline and amount', () => {
        const fixture = TestBed.createComponent(ActionAuthComponent);

        fixture.detectChanges();
        fixture.componentInstance.place();
        fixture.componentInstance.place();
        expect(place).toHaveBeenCalledTimes(1);
        response.next({
            id: 17,
            status: EnumOrderStatus.PendingPayment,
            subtotalAmount: 12345,
            discountAmount: 0,
            totalAmount: 12345,
            currency: 'RUB',
            discounts: [],
            patterns: [],
            placedAt: new Date('2026-11-04T12:00:00Z'),
            paymentExpiresAt: new Date('2026-11-11T12:00:00Z'),
            appSettingsVersion: 3,
            paidAt: null,
            cancelledAt: null,
            cancelReason: null,
        });
        response.complete();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Заказ №17 оформлен');
        expect(fixture.nativeElement.textContent).toContain('123.45 RUB');
        expect(fixture.nativeElement.textContent).toContain('11.11.2026');
    });

    it('shows conflicting positions and requires explicit refresh and confirmation', () => {
        place.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: {
            items: [{ itemId: 1, name: 'Волны', reasons: [EnumCheckoutConflictReason.SizeOwned] }],
        } })));
        const fixture = TestBed.createComponent(ActionAuthComponent);

        fixture.detectChanges();
        fixture.componentInstance.place();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Волны: размер уже куплен');
        fixture.componentInstance.place();
        expect(place).toHaveBeenCalledTimes(1);
        fixture.componentInstance.updateCart();
        expect(reset).toHaveBeenCalledTimes(1);
        expect(place).toHaveBeenCalledTimes(1);
        fixture.componentInstance.place();
        expect(place).toHaveBeenCalledTimes(2);
    });

    it('does not submit when logged out', () => {
        auth.set(false);
        const fixture = TestBed.createComponent(ActionAuthComponent);

        fixture.detectChanges();
        fixture.componentInstance.place();
        expect(place).not.toHaveBeenCalled();
    });
});
