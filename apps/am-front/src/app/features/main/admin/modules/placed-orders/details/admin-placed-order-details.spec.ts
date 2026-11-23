import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { EnumOrderStatus } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService } from '@am-front/services/admin-placed-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { placedOrder } from '../order-fixture';
import { AdminPlacedOrderDetails } from './admin-placed-order-details';


describe('administrative order details refresh', () => {
    const service = {
        details: jest.fn(),
    };
    const admin = signal(true);

    beforeEach(() => {
        admin.set(true);
        service.details.mockReset().mockReturnValue(of(placedOrder()));
        TestBed.configureTestingModule({
            imports: [AdminPlacedOrderDetails],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: new BehaviorSubject(convertToParamMap({ id: '7' })),
                    },
                },
                {
                    provide: AdminPlacedOrdersService,
                    useValue: service,
                },
                {
                    provide: AuthService,
                    useValue: {
                        auth: signal(true),
                        token: signal('test'),
                        sessionRevision: 0,
                    },
                },
                {
                    provide: ProfileService,
                    useValue: { isAdmin: admin },
                },
            ],
        });
    });

    it('polls an accepted or unknown operation until confirmed and never treats acceptance as REFUNDED', fakeAsync(() => {
        const accepted = placedOrder();

        accepted.refundUnavailableReason = 'Возврат обрабатывается';
        accepted.refunds = [
            {
                id: 11,
                status: 'unknown',
                amount: 12345,
                currency: 'RUB',
                paymentId: 3,
                externalId: null,
                initiatedBy: 1,
                reason: 'Полный возврат',
                createdAt: new Date(),
                completedAt: null,
                errorCode: null,
            },
        ];
        service.details.mockReturnValue(of(accepted));

        const fixture = TestBed.createComponent(AdminPlacedOrderDetails);

        fixture.detectChanges();
        tick(0);
        fixture.detectChanges();
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.Success);
        expect(fixture.nativeElement.textContent).toContain('Возврат ещё не подтверждён');

        const refunded = {
            ...accepted,
            status: EnumOrderStatus.Refunded,
            refunds: [
                {
                    ...accepted.refunds[0],
                    status: 'succeeded' as const,
                },
            ],
        };

        service.details.mockReturnValue(of(refunded));
        tick(5000);
        fixture.detectChanges();
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.Refunded);
        const calls = service.details.mock.calls.length;

        tick(10000);
        expect(service.details).toHaveBeenCalledTimes(calls);
        fixture.destroy();
    }));

    it('retains the last known snapshot on refresh error and allows retry', fakeAsync(() => {
        const fixture = TestBed.createComponent(AdminPlacedOrderDetails);

        fixture.detectChanges();
        tick(0);
        service.details.mockReturnValue(throwError(() => new Error('offline')));
        fixture.componentInstance.refresh();
        fixture.detectChanges();
        expect(fixture.componentInstance.order()?.totalAmount).toBe(12345);
        expect(fixture.nativeElement.textContent).toContain('Не удалось загрузить актуальное состояние');
        service.details.mockReturnValue(of(placedOrder()));
        fixture.componentInstance.refresh();
        expect(fixture.componentInstance.load.errors()).toBeNull();
        fixture.destroy();
    }));

    it('clears customer and financial data on role loss', fakeAsync(() => {
        const fixture = TestBed.createComponent(AdminPlacedOrderDetails);

        fixture.detectChanges();
        tick(0);
        expect(fixture.componentInstance.order()).not.toBeNull();
        admin.set(false);
        fixture.detectChanges();
        expect(fixture.componentInstance.order()).toBeNull();
        fixture.destroy();
    }));
});
