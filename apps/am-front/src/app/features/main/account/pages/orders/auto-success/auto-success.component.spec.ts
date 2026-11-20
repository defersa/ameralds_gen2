import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { EnumOrderStatus, EnumPaymentStatus, type PaymentStateDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { PurchaseSyncService } from '@am-front/services/purchase-sync.service';
import { UserOrdersService } from '@am-front/services/user-orders.service';
import { AutoSuccessComponent } from './auto-success.component';


describe('auto-success purchase result', () => {
    const authenticated = signal(true);
    const token = signal('test-session');
    const getPaymentState = jest.fn();
    const purchaseConfirmed = jest.fn();

    const auth = {
        auth: authenticated,
        token,
        sessionRevision: 0,
    };

    const completed = {
        orderId: 17,
        orderStatus: EnumOrderStatus.Success,
        paymentStatus: EnumPaymentStatus.SUCCEEDED,
        resolution: 'completed',
        checkedAt: new Date(),
        verificationUnavailable: false,
    } satisfies PaymentStateDto;

    let params: BehaviorSubject<ParamMap>;

    beforeEach(() => {
        jest.clearAllMocks();
        authenticated.set(true);
        token.set('test-session');
        auth.sessionRevision = 0;
        params = new BehaviorSubject(convertToParamMap({ id: '17' }));
        getPaymentState.mockReturnValue(of(completed));
        TestBed.configureTestingModule({
            imports: [AutoSuccessComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: params },
                },
                {
                    provide: AuthService,
                    useValue: auth,
                },
                {
                    provide: UserOrdersService,
                    useValue: { getPaymentState },
                },
                {
                    provide: PurchaseSyncService,
                    useValue: { purchaseConfirmed },
                },
            ],
        });
    });

    it('shows a purchase only after server confirmation and updates purchased rights and the cart', () => {
        const response = new Subject<PaymentStateDto>();

        getPaymentState.mockReturnValue(response);

        const fixture = TestBed.createComponent(AutoSuccessComponent);

        fixture.detectChanges();
        expect(getPaymentState).toHaveBeenCalledWith(17);
        expect(fixture.componentInstance.completed()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('Проверяем завершение заказа');
        expect(purchaseConfirmed).not.toHaveBeenCalled();
        response.next(completed);
        response.complete();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Заказ №17 успешно завершён');
        expect(fixture.nativeElement.querySelector('a[href="/account/patterns"]')).not.toBeNull();
        expect(purchaseConfirmed).toHaveBeenCalledTimes(1);
    });

    it.each(['pending', 'compensation'])('does not infer completion from the page URL for %s', (scenario) => {
        getPaymentState.mockReturnValue(of({
            ...completed,
            orderStatus: scenario === 'pending' ? EnumOrderStatus.PendingPayment : EnumOrderStatus.Cancel,
            resolution: scenario === 'pending' ? null : 'compensation_required',
        }));

        const fixture = TestBed.createComponent(AutoSuccessComponent);

        fixture.detectChanges();
        expect(fixture.componentInstance.completed()).toBe(false);
        expect(fixture.nativeElement.textContent).not.toContain('успешно завершён');
        expect(purchaseConfirmed).not.toHaveBeenCalled();
    });

    it('allows one retry after a failed check and blocks repeated checks while loading', () => {
        getPaymentState.mockReturnValueOnce(throwError(() => new Error('Unavailable')));

        const fixture = TestBed.createComponent(AutoSuccessComponent);

        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Не удалось проверить заказ');

        const response = new Subject<PaymentStateDto>();

        getPaymentState.mockReturnValue(response);
        fixture.nativeElement.querySelector('button').click();
        fixture.componentInstance.check();
        expect(getPaymentState).toHaveBeenCalledTimes(2);
        response.next(completed);
        response.complete();
        fixture.detectChanges();
        expect(fixture.componentInstance.completed()).toBe(true);
    });

    it('does not read personal orders without authentication and clears success on logout', () => {
        authenticated.set(false);

        const fixture = TestBed.createComponent(AutoSuccessComponent);

        fixture.detectChanges();
        expect(getPaymentState).not.toHaveBeenCalled();
        authenticated.set(true);
        fixture.detectChanges();
        expect(fixture.componentInstance.completed()).toBe(true);
        authenticated.set(false);
        fixture.detectChanges();
        expect(fixture.componentInstance.state()).toBeNull();
    });

    it('ignores an old response after the order or session changes', () => {
        const response = new Subject<PaymentStateDto>();

        getPaymentState.mockReturnValue(response);

        const fixture = TestBed.createComponent(AutoSuccessComponent);

        fixture.detectChanges();
        params.next(convertToParamMap({ id: '18' }));
        response.next(completed);
        fixture.detectChanges();
        expect(fixture.componentInstance.completed()).toBe(false);
        expect(purchaseConfirmed).not.toHaveBeenCalled();
        auth.sessionRevision++;
        response.next({
            ...completed,
            orderId: 18,
        });
        expect(fixture.componentInstance.completed()).toBe(false);
    });
});
