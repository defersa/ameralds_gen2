import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { AmstorePanelExpandComponent } from '@am-front/cdk/panel/panel-expand/panel-expand.component';
import { EnumOrderStatus, type AdminPlacedOrdersPageDto } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService } from '@am-front/services/admin-placed-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { AdminOrdersFiltersComponent } from '@am-front/shared/filters/admin-orders/admin-orders-filters.component';
import { placedOrder } from '../order-fixture';
import { AdminPlacedOrders } from './admin-placed-orders';


describe('administrative placed orders list', () => {
    const authenticated = signal(true);
    const admin = signal(true);
    const service = {
        list: jest.fn(),
    };

    beforeEach(() => {
        authenticated.set(true);
        admin.set(true);
        service.list.mockReset().mockReturnValue(
            of({
                page: 2,
                pageSize: 10,
                count: 3,
                total: 25,
                items: [placedOrder()],
            }),
        );
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    {
                        path: 'admin/orders',
                        component: AdminPlacedOrders,
                    },
                ]),
                provideNoopAnimations(),
                {
                    provide: AdminPlacedOrdersService,
                    useValue: service,
                },
                {
                    provide: AuthService,
                    useValue: {
                        auth: authenticated,
                        token: signal('test'),
                    },
                },
                {
                    provide: ProfileService,
                    useValue: { isAdmin: admin },
                },
            ],
        });
    });

    it('restores combined filters and keeps them on links and page changes', async () => {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(
            '/admin/orders?page=2&pageSize=10&user=buyer&statuses=success,cancel&from=2026-11-01&to=2026-11-22',
            AdminPlacedOrders,
        );

        harness.detectChanges();
        expect(service.list).toHaveBeenCalledWith({
            page: 2,
            pageSize: 10,
            user: 'buyer',
            statuses: 'success,cancel',
            from: '2026-11-01',
            to: '2026-11-22',
        });
        const filters = harness.routeDebugElement?.query(By.directive(AdminOrdersFiltersComponent)).injector.get(AdminOrdersFiltersComponent);

        if (!filters) {
            throw new Error('Expected common orders filters');
        }

        expect(filters.model()).toMatchObject({
            statuses: [EnumOrderStatus.Success, EnumOrderStatus.Cancel],
            user: 'buyer',
            pageSize: 10,
        });
        expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toContain('/admin/orders/7?');
        expect(harness.routeNativeElement?.querySelector('amstore-order-snapshot')?.textContent).toContain('buyer@example.test');
        expect(harness.routeNativeElement?.querySelector('table')).toBeNull();
        filters.handlePagination(3);
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(TestBed.inject(Router).url).toContain('page=3');
        expect(TestBed.inject(Router).url).toContain('statuses=success,cancel');
    });

    it('applies a real email control and resets the page', async () => {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/admin/orders?page=2', AdminPlacedOrders);

        harness.detectChanges();

        const input = harness.routeNativeElement?.querySelector<HTMLInputElement>('amstore-input-signal input');

        if (!input) {
            throw new Error('Expected customer search control');
        }

        input.value = 'other@example.test';
        input.dispatchEvent(new Event('input'));
        harness.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 1100));
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(TestBed.inject(Router).url).not.toContain('page=2');
        expect(service.list).toHaveBeenLastCalledWith(
            expect.objectContaining({
                page: 1,
                user: 'other@example.test',
            }),
        );
    });

    it('uses the common multi-select and page-size controls and clears without collapsing the panel', async () => {
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/admin/orders?page=2', AdminPlacedOrders);
        harness.detectChanges();

        const panel = harness.routeDebugElement?.query(By.directive(AmstorePanelExpandComponent)).injector.get(AmstorePanelExpandComponent);

        if (!panel) {
            throw new Error('Expected expandable filters');
        }

        panel.changeState();
        harness.detectChanges();

        const loader = TestbedHarnessEnvironment.loader(harness.fixture);
        const [statuses, pageSize] = await loader.getAllHarnesses(MatSelectHarness);

        await statuses.clickOptions({ text: 'Ожидает оплаты' });
        await statuses.clickOptions({ text: 'Оплачен' });
        await statuses.close();
        await pageSize.clickOptions({ text: '50' });
        await new Promise(resolve => setTimeout(resolve, 1100));
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({
            page: 1,
            pageSize: 50,
            statuses: 'pending_payment,success',
        }));

        const clear = harness.routeNativeElement?.querySelector<HTMLElement>('amstore-panel-header amstore-button');

        if (!clear) {
            throw new Error('Expected clear filters button');
        }

        clear.click();
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(panel.state()).toBe(true);
        expect(TestBed.inject(Router).url).toBe('/admin/orders');
        expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 20, statuses: undefined }));
    });

    it('validates the shared datepicker and preserves the UTC calendar day after correction', async () => {
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/admin/orders?to=2026-11-22', AdminPlacedOrders);
        harness.detectChanges();

        const start = harness.routeNativeElement?.querySelector<HTMLInputElement>('amstore-datepicker-signal input');

        if (!start) {
            throw new Error('Expected shared datepicker input');
        }

        start.value = '23.11.2026';
        start.dispatchEvent(new Event('input'));
        start.dispatchEvent(new Event('change'));
        start.dispatchEvent(new Event('blur'));
        harness.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 1100));
        expect(service.list).toHaveBeenCalledTimes(1);
        expect(harness.routeNativeElement?.textContent).toContain('Начало периода должно быть не позже конца');

        start.value = '21.11.2026';
        start.dispatchEvent(new Event('input'));
        start.dispatchEvent(new Event('change'));
        start.dispatchEvent(new Event('blur'));
        harness.detectChanges();
        await new Promise(resolve => setTimeout(resolve, 1100));
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-11-21', to: '2026-11-22' }));
    });

    it('clears sensitive results and cancels outstanding requests on role loss', async () => {
        const pending = new Subject<AdminPlacedOrdersPageDto>();

        service.list.mockReturnValue(pending);

        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/admin/orders', AdminPlacedOrders);

        harness.detectChanges();
        admin.set(false);
        harness.detectChanges();
        pending.next({
            page: 1,
            pageSize: 20,
            count: 1,
            total: 1,
            items: [placedOrder()],
        });
        expect(page.result()).toBeNull();
        expect(harness.routeNativeElement?.textContent).toContain('требуется доступ администратора');
    });

    it('shows an error, supports retry and blocks a duplicate request', async () => {
        service.list.mockReturnValueOnce(throwError(() => new Error('offline')));

        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/admin/orders', AdminPlacedOrders);

        harness.detectChanges();
        expect(harness.routeNativeElement?.textContent).toContain('Не удалось загрузить');

        const pending = new Subject<AdminPlacedOrdersPageDto>();

        service.list.mockReturnValue(pending);
        page.retry();
        page.retry();
        expect(service.list).toHaveBeenCalledTimes(2);
        pending.next({
            page: 1,
            pageSize: 20,
            count: 1,
            total: 0,
            items: [],
        });
        harness.detectChanges();
        expect(harness.routeNativeElement?.textContent).toContain('Оформленных заказов пока нет');
    });
});
