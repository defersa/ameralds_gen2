import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ApiOrdersProducer, EnumOrderStatus, UserOrderSummaryDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { CategoriesService } from '@am-front/services/categories.service';
import { OrderDetailsComponent } from './order-details.component';


describe('personal order page', () => {
    const authenticated = signal(true);
    const getOrder = jest.fn();
    const cancelOrder = jest.fn();
    const auth = { auth: authenticated, sessionRevision: 0 };
    let routeParams: BehaviorSubject<ParamMap>;

    const cancelled = {
        id: 17,
        status: EnumOrderStatus.Cancel,
        createdAt: new Date('2026-11-09T12:00:00Z'),
        updatedAt: new Date('2026-11-10T12:00:00Z'),
        placedAt: new Date('2026-11-09T12:00:00Z'),
        subtotalAmount: 12345,
        discountAmount: 0,
        totalAmount: 12345,
        currency: 'RUB',
        paymentExpiresAt: new Date('2026-11-16T12:00:00Z'),
        paidAt: null,
        cancelledAt: new Date('2026-11-10T12:00:00Z'),
        cancelReason: 'user_cancelled',
        appSettingsVersion: 1,
    } satisfies UserOrderSummaryDto;

    const stored = {
        id: 17,
        status: EnumOrderStatus.PendingPayment,
        totalAmount: 12345,
        currency: 'RUB',
        placedAt: new Date('2026-11-09T12:00:00Z'),
        paymentExpiresAt: new Date('2026-11-16T12:00:00Z'),
        patterns: [{
            id: 31,
            name: { ru: 'Волны' },
            categories: [4],
            images: [],
            sizes: [{ id: 21, size: { value: 36 } }],
            color: true,
            snapshot: { totalAmount: 12345 },
        }],
    };

    beforeEach(() => {
        authenticated.set(true);
        auth.sessionRevision = 0;
        routeParams = new BehaviorSubject(convertToParamMap({ id: '17' }));
        jest.clearAllMocks();
        getOrder.mockReturnValue(of(stored));
        cancelOrder.mockReturnValue(of(cancelled));
        TestBed.configureTestingModule({ imports: [OrderDetailsComponent], providers: [
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { paramMap: routeParams } },
            { provide: AuthService, useValue: auth },
            { provide: ApiOrdersProducer, useValue: { userOrdersControllerGetOrder: getOrder, userOrdersControllerCancelOrder: cancelOrder } },
            { provide: CategoriesService, useValue: { categoriesById: signal({ 4: { value: 4, label: 'Природа' } }) } },
        ] });
    });

    it('loads a pending order using its URL and shows cart-style cards without modification actions', () => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        expect(getOrder).toHaveBeenCalledWith(17);
        expect(fixture.nativeElement.textContent).toContain('Заказ №17');
        expect(fixture.nativeElement.textContent).toContain('Волны');
        expect(fixture.nativeElement.textContent).toContain('36');
        expect(fixture.nativeElement.textContent).toContain('Подбор включён');
        expect(fixture.nativeElement.textContent).toContain('Природа');
        expect(fixture.nativeElement.textContent).toContain('123.45 RUB');
        expect(fixture.nativeElement.textContent).toContain('16.11.2026');
        expect(fixture.nativeElement.querySelector('amstore-snapshot-pattern')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('amstore-pattern-order-preview')).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toMatch(/Изменить|Удалить|Добавить/);

        const navigation: HTMLElement = fixture.nativeElement.querySelector('nav');

        expect(navigation.querySelector('a[routerLink="/account/orders"]')?.getAttribute('href')).toBe('/account/orders');
        expect(navigation.querySelector('a[routerLink="/cart"]')?.getAttribute('href')).toBe('/cart');

        const pay = fixture.debugElement.query(By.css('amstore-button[aria-disabled="true"]'));

        expect(pay.nativeElement.textContent.trim()).toBe('Оплатить');
        expect(pay.componentInstance.disabled()).toBe(true);
        expect(pay.nativeElement.getAttribute('aria-disabled')).toBe('true');
    });

    it('loads the order again after reopening the page instead of relying on checkout state', () => {
        const first = TestBed.createComponent(OrderDetailsComponent);

        first.detectChanges();
        first.destroy();

        const reopened = TestBed.createComponent(OrderDetailsComponent);

        reopened.detectChanges();
        expect(getOrder).toHaveBeenCalledTimes(2);
        expect(reopened.nativeElement.textContent).toContain('Волны');
    });

    it('does not request personal orders without authentication', () => {
        authenticated.set(false);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        expect(getOrder).not.toHaveBeenCalled();
        expect(fixture.componentInstance.order()).toBeNull();
    });

    it('does not expose a foreign or unavailable order', () => {
        getOrder.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Заказ недоступен');
        expect(fixture.nativeElement.querySelector('amstore-snapshot-pattern')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Оплатить');
    });

    it('does not offer payment for paid orders', () => {
        getOrder.mockReturnValue(of({ ...stored, status: EnumOrderStatus.Success }));

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Оплачен');
        expect(fixture.nativeElement.textContent).not.toContain('Оплатить');
    });
    it('cancels from the real button, updates status and dates and preserves the displayed composition', () => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[amstore-button]');

        expect(button.textContent).toContain('Отменить');

        button.click();
        fixture.detectChanges();

        expect(cancelOrder).toHaveBeenCalledWith(17);
        expect(fixture.nativeElement.textContent).toContain('Статус: Отменён');
        expect(fixture.nativeElement.textContent).not.toContain('Оплатить');
        expect(fixture.nativeElement.querySelector('button[amstore-button]')).toBeNull();
        expect(fixture.componentInstance.order()?.cancelledAt).toEqual(cancelled.cancelledAt);
        expect(fixture.componentInstance.order()?.patterns).toBe(stored.patterns);
        expect(fixture.nativeElement.textContent).toContain('Волны');
    });

    it('prevents duplicate cancellation while the request is pending', () => {
        const pending = new Subject<UserOrderSummaryDto>();

        cancelOrder.mockReturnValue(pending);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.cancelOrder();
        fixture.componentInstance.cancelOrder();
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[amstore-button]');

        expect(cancelOrder).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
        expect(button.textContent).toContain('Отменяем');

        pending.next(cancelled);
        fixture.detectChanges();

        expect(fixture.componentInstance.status()).toBe('Отменён');
    });

    it('shows a failed cancellation and permits retry without changing the current order', () => {
        cancelOrder.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.cancelOrder();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Не удалось отменить заказ');
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.PendingPayment);

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[amstore-button]');

        expect(button.disabled).toBe(false);

        button.click();
        fixture.detectChanges();

        expect(cancelOrder).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.Cancel);
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it.each([EnumOrderStatus.Success, EnumOrderStatus.Cancel, EnumOrderStatus.Refunded])(
        'does not offer or submit cancellation for status %s',
        status => {
            getOrder.mockReturnValue(of({ ...stored, status }));

            const fixture = TestBed.createComponent(OrderDetailsComponent);

            fixture.detectChanges();
            fixture.componentInstance.cancelOrder();

            expect(fixture.nativeElement.querySelector('button[amstore-button]')).toBeNull();
            expect(cancelOrder).not.toHaveBeenCalled();
        },
    );

    it('ignores a cancellation response after switching to another order', () => {
        const pending = new Subject<UserOrderSummaryDto>();

        cancelOrder.mockReturnValue(pending);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.cancelOrder();

        getOrder.mockReturnValue(of({ ...stored, id: 99 }));
        routeParams.next(convertToParamMap({ id: '99' }));
        fixture.detectChanges();
        pending.next(cancelled);
        fixture.detectChanges();

        expect(pending.observed).toBe(false);
        expect(fixture.componentInstance.order()?.id).toBe(99);
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.PendingPayment);
    });

    it('clears the order and ignores a cancellation response after logout', () => {
        const pending = new Subject<UserOrderSummaryDto>();

        cancelOrder.mockReturnValue(pending);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.cancelOrder();

        authenticated.set(false);
        auth.sessionRevision++;
        fixture.detectChanges();
        pending.next(cancelled);
        fixture.componentInstance.cancelOrder();
        fixture.detectChanges();

        expect(fixture.componentInstance.order()).toBeNull();
        expect(cancelOrder).toHaveBeenCalledTimes(1);
        expect(pending.observed).toBe(false);
    });

});
