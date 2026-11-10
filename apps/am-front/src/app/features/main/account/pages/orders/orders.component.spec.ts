import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiOrdersProducer, EnumOrderStatus, UserOrderSummaryDto, UserOrdersPageDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { UserOrdersFiltersComponent } from '@am-front/shared/filters/user-orders/user-orders-filters.component';
import { By } from '@angular/platform-browser';
import { OrdersComponent } from './orders.component';


describe('user orders list', () => {
    const authenticated = signal(true);
    const getOrders = jest.fn();

    const order = {
        id: 17,
        status: EnumOrderStatus.Success,
        createdAt: new Date('2026-11-09T12:00:00Z'),
        updatedAt: new Date('2026-11-09T12:00:00Z'),
        placedAt: new Date('2026-11-09T12:00:00Z'),
        subtotalAmount: 12345,
        discountAmount: 0,
        totalAmount: 12345,
        currency: 'RUB',
        paymentExpiresAt: null,
        paidAt: new Date('2026-11-09T12:00:00Z'),
        cancelledAt: null,
        cancelReason: null,
        appSettingsVersion: null,
    } satisfies UserOrderSummaryDto;

    beforeEach(() => {
        authenticated.set(true);
        getOrders.mockReset().mockReturnValue(of({ page: 2, count: 3, items: [order] }));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{ path: 'orders', component: OrdersComponent }]),
                provideNoopAnimations(),
                { provide: AuthService, useValue: { auth: authenticated } },
                { provide: ApiOrdersProducer, useValue: { userOrdersControllerGetOrders: getOrders } },
            ],
        });
    });

    it('restores filters from URL, preserves zero and includes the entire end day', async () => {
        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/orders?page=2&status=success&startDate=2026-11-01&endDate=2026-11-09&minPrice=0&maxPrice=123.45', OrdersComponent);

        harness.detectChanges();
        expect(getOrders).toHaveBeenCalledWith(2, EnumOrderStatus.Success, new Date(2026, 10, 1), new Date(2026, 10, 10), 0, 12345);
        expect(page.orders()).toEqual([order]);
        expect(page.pagesCount()).toBe(3);
        expect(harness.routeNativeElement?.querySelector('amstore-order-snapshot')).not.toBeNull();
        expect(harness.routeNativeElement?.textContent).toContain('Заказ №17');
        expect(harness.routeNativeElement?.textContent).toContain('Оплачен');
        expect(harness.routeNativeElement?.textContent).toContain('123.45');
        expect(harness.routeNativeElement?.querySelector('a[aria-label="Подробнее о заказе №17"]')?.getAttribute('href')).toBe('/account/orders/17');
        expect(harness.routeNativeElement?.querySelector('amstore-snapshot-pattern')).toBeNull();
    });

    it('does not request orders without authentication and clears results after logout', async () => {
        authenticated.set(false);

        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/orders', OrdersComponent);

        harness.detectChanges();
        expect(getOrders).not.toHaveBeenCalled();
        authenticated.set(true);
        harness.detectChanges();
        expect(page.orders()).toEqual([order]);
        authenticated.set(false);
        harness.detectChanges();
        expect(page.orders()).toEqual([]);
    });

    it('allows retry after an error and prevents a duplicate retry during loading', async () => {
        getOrders.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/orders', OrdersComponent);

        harness.detectChanges();
        expect(harness.routeNativeElement?.textContent).toContain('Не удалось загрузить');

        const pending = new Subject<UserOrdersPageDto>();

        getOrders.mockReturnValue(pending);
        page.retry();
        page.retry();
        expect(getOrders).toHaveBeenCalledTimes(2);
        pending.next({ page: 1, count: 1, items: [] });
        harness.detectChanges();
        expect(harness.routeNativeElement?.textContent).toContain('Заказы не найдены');
    });

    it('cancels stale requests when changing page and retains filters', async () => {
        const pending = new Subject<UserOrdersPageDto>();

        getOrders.mockReturnValueOnce(pending);

        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/orders?status=success', OrdersComponent);

        harness.detectChanges();
        await TestBed.inject(Router).navigateByUrl('/orders?status=success&page=2');
        harness.detectChanges();
        pending.next({ page: 1, count: 1, items: [{ ...order, id: 999 }] });
        expect(page.orders()).toEqual([order]);
        expect(getOrders).toHaveBeenLastCalledWith(2, EnumOrderStatus.Success, undefined, undefined, undefined, undefined);
    });

    it('applies a real price control with debounce, resets page and blocks an inverted range', async () => {
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/orders?page=2', OrdersComponent);
        harness.detectChanges();

        const filters = harness.routeDebugElement?.query(By.directive(UserOrdersFiltersComponent)).componentInstance as UserOrdersFiltersComponent;
        const inputs = harness.routeNativeElement?.querySelectorAll<HTMLInputElement>('input[type="number"]');
        const minPrice = inputs?.[0];

        if (!minPrice) {
            throw new Error('Price control missing');
        }

        minPrice.value = '10';
        minPrice.dispatchEvent(new Event('input'));
        harness.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 650));
        harness.detectChanges();
        expect(TestBed.inject(Router).url).toContain('minPrice=10');
        expect(TestBed.inject(Router).url).not.toContain('page=2');
        expect(getOrders).toHaveBeenLastCalledWith(1, undefined, undefined, undefined, 1000, undefined);
        filters.model.set({ ...filters.model(), maxPrice: 5 });
        harness.detectChanges();
        expect(filters.filterForm().invalid()).toBe(true);
    });
});
