import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ApiOrdersProducer, EnumOrderStatus, EnumPaymentStatus, PaymentAttemptDto, PaymentStateDto, UserOrderSummaryDto } from '@am-front/root/api-v2';
import { UserOrdersService } from '@am-front/services/user-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { CategoriesService } from '@am-front/services/categories.service';
import { PurchaseSyncService } from '@am-front/services/purchase-sync.service';
import { OrderDetailsComponent } from './order-details.component';


describe('personal order page', () => {
    const authenticated = signal(true);
    const accessToken = signal('test-access');
    const getOrder = jest.fn();
    const cancelOrder = jest.fn();
    const createPayment = jest.fn();
    const redirect = jest.fn();
    const getState = jest.fn();
    const purchaseConfirmed = jest.fn();
    const auth = { auth: authenticated, token: accessToken, sessionRevision: 0 };
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

    const attempt = {
        id: 1,
        orderId: 17,
        status: EnumPaymentStatus.PENDING,
        amount: 12345,
        currency: 'RUB',
        confirmationUrl: 'https://pay.example.test/1',
        redirectUrl: 'https://pay.example.test/1',
        createdAt: new Date('2026-11-10T12:00:00Z'),
        paidAt: null,
        testMode: true,
    } satisfies PaymentAttemptDto;

    const pendingState = {
        orderId: 17,
        orderStatus: EnumOrderStatus.PendingPayment,
        paymentStatus: EnumPaymentStatus.PENDING,
        resolution: null,
        checkedAt: new Date(),
        verificationUnavailable: false,
    } satisfies PaymentStateDto;

    beforeEach(() => {
        authenticated.set(true);
        accessToken.set('test-access');
        auth.sessionRevision = 0;
        routeParams = new BehaviorSubject(convertToParamMap({ id: '17' }));
        jest.clearAllMocks();
        getOrder.mockReturnValue(of(stored));
        cancelOrder.mockReturnValue(of(cancelled));
        createPayment.mockReturnValue(of(attempt));
        getState.mockReturnValue(of({
            orderId: 17, orderStatus: EnumOrderStatus.PendingPayment, paymentStatus: EnumPaymentStatus.PENDING,
            resolution: null, checkedAt: new Date(), verificationUnavailable: false,
        }));
        TestBed.configureTestingModule({ imports: [OrderDetailsComponent], providers: [
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { paramMap: routeParams } },
            { provide: AuthService, useValue: auth },
            { provide: PurchaseSyncService, useValue: { purchaseConfirmed } },
            { provide: ApiOrdersProducer, useValue: { userOrdersControllerGetOrder: getOrder, userOrdersControllerCancelOrder: cancelOrder, paymentsControllerCreatePayment: createPayment, paymentsControllerGetPaymentState: getState } },
            { provide: CategoriesService, useValue: { categoriesById: signal({ 4: { value: 4, label: 'Природа' } }) } },
        ] });
        jest.spyOn(TestBed.inject(UserOrdersService), 'redirectToPayment').mockImplementation(redirect);
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

        const pay = fixture.debugElement.query(By.css('button[color="primary"]'));

        expect(pay.nativeElement.textContent.trim()).toBe('Оплатить');
        expect(pay.componentInstance.disabled()).toBe(false);
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

    it('creates payment from the real button and redirects without marking the order paid', () => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.nativeElement.querySelector('button[color="primary"]').click();
        fixture.detectChanges();

        expect(createPayment).toHaveBeenCalledWith(17, { idempotencyKey: expect.any(String) });
        expect(redirect).toHaveBeenCalledWith(attempt);
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.PendingPayment);
        expect(fixture.nativeElement.textContent).toContain('Тестовая оплата без списания денег');
    });

    it('blocks repeated payment and cancellation while preparing the link', () => {
        const pending = new Subject<PaymentAttemptDto>();

        createPayment.mockReturnValue(pending);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.pay();
        fixture.componentInstance.pay();
        fixture.componentInstance.cancelOrder();
        fixture.detectChanges();

        expect(createPayment).toHaveBeenCalledTimes(1);
        expect(cancelOrder).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('button[color="primary"]').disabled).toBe(true);
        expect(fixture.nativeElement.querySelector('button[color="warn"]').disabled).toBe(true);
    });

    it('reuses the payment key after a timeout and shows a retryable error', () => {
        createPayment.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.pay();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Не удалось получить ссылку');
        fixture.componentInstance.pay();

        expect(createPayment.mock.calls[1]).toEqual(createPayment.mock.calls[0]);
    });

    it.each([EnumPaymentStatus.FAILED, EnumPaymentStatus.CANCELLED])('uses a new key only after a terminal result %s', status => {
        createPayment.mockReturnValueOnce(of({ ...attempt, status, confirmationUrl: null }));

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.pay();
        fixture.componentInstance.pay();

        expect(createPayment.mock.calls[1][1].idempotencyKey).not.toBe(createPayment.mock.calls[0][1].idempotencyKey);
        expect(redirect).toHaveBeenCalledTimes(1);
    });

    it.each(['route', 'logout'])('ignores a late payment link after %s', context => {
        const pending = new Subject<PaymentAttemptDto>();

        createPayment.mockReturnValue(pending);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.pay();

        if (context === 'route') {
            getOrder.mockReturnValue(of({ ...stored, id: 99 }));
            routeParams.next(convertToParamMap({ id: '99' }));
        } else {
            authenticated.set(false);
            auth.sessionRevision++;
        }

        fixture.detectChanges();
        pending.next(attempt);

        expect(pending.observed).toBe(false);
        expect(redirect).not.toHaveBeenCalled();
    });

    it('keeps a captured payment separate from order completion and blocks another payment', () => {
        createPayment.mockReturnValue(of({ ...attempt, status: EnumPaymentStatus.SUCCEEDED, confirmationUrl: null }));

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.pay();
        fixture.componentInstance.pay();
        fixture.detectChanges();

        expect(createPayment).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.PendingPayment);
        expect(fixture.nativeElement.textContent).toContain('Ожидается подтверждение заказа');
    });

    it('shows success only from the backend and refreshes purchases once', () => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        getState.mockReturnValue(of({
            orderId: 17, orderStatus: EnumOrderStatus.Success, paymentStatus: EnumPaymentStatus.SUCCEEDED,
            resolution: 'completed', checkedAt: new Date(), verificationUnavailable: false,
        }));
        fixture.componentInstance.checkPayment();
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Оплата подтверждена');
        expect(fixture.nativeElement.querySelector('button[color="primary"]')).toBeNull();
        expect(purchaseConfirmed).toHaveBeenCalledTimes(1);
    });

    it('preserves uncertainty on provider failure and can check again after the minimum progress duration', fakeAsync(() => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(0);
        getState.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Пока не удалось проверить оплату');
        expect(purchaseConfirmed).not.toHaveBeenCalled();
        expect(fixture.componentInstance.showPaymentCheckProgress()).toBe(true);
        tick(500);
        fixture.detectChanges();
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Ожидаем подтверждение');
        fixture.destroy();
    }));

    it.each([0, 100, 249])('shows manual progress immediately for at least 500 ms after a %s ms response', fakeAsync((responseMs: number) => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(0);
        fixture.detectChanges();
        getState.mockClear();

        const response = new Subject<PaymentStateDto>();

        getState.mockReturnValue(response);
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-busy]');

        expect(button.disabled).toBe(true);
        expect(button.classList.contains('amstore-button-default-disabled')).toBe(true);
        expect(button.getAttribute('aria-busy')).toBe('true');
        expect(button.querySelector('[aria-hidden="false"]')?.textContent.trim()).toBe('Проверяем…');
        button.click();
        fixture.componentInstance.checkPayment();
        expect(getState).toHaveBeenCalledTimes(1);
        tick(responseMs);
        response.next(pendingState);
        response.complete();
        fixture.detectChanges();
        tick(499 - responseMs);
        fixture.detectChanges();
        expect(button.disabled).toBe(true);
        expect(button.getAttribute('aria-busy')).toBe('true');
        fixture.componentInstance.checkPayment();
        expect(getState).toHaveBeenCalledTimes(1);
        tick(1);
        fixture.detectChanges();
        expect(fixture.componentInstance.showPaymentCheckProgress()).toBe(false);
        expect(button.classList.contains('amstore-button-default-disabled')).toBe(false);
        expect(button.getAttribute('aria-busy')).toBe('false');
        expect(button.querySelector('[aria-hidden="false"]')?.textContent.trim()).toBe('Проверить оплату');
        expect(button.disabled).toBe(false);
        fixture.destroy();
    }));

    it.each(['success', 'error'])('keeps manual progress until a slow request ends with %s', fakeAsync((outcome: string) => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(0);
        fixture.detectChanges();
        getState.mockClear();

        const response = new Subject<PaymentStateDto>();

        getState.mockReturnValue(response);
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-busy]');

        expect(fixture.componentInstance.showPaymentCheckProgress()).toBe(true);
        tick(750);
        fixture.detectChanges();
        expect(button.disabled).toBe(true);
        expect(button.classList.contains('amstore-button-default-disabled')).toBe(true);
        expect(button.querySelector('[aria-hidden="false"]')?.textContent.trim()).toBe('Проверяем…');
        fixture.componentInstance.checkPayment();
        expect(getState).toHaveBeenCalledTimes(1);

        if (outcome === 'success') {
            response.next(pendingState);
            response.complete();
        } else {
            response.error(new HttpErrorResponse({ status: 503 }));
        }

        fixture.detectChanges();
        expect(getState).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(false);
        expect(button.classList.contains('amstore-button-default-disabled')).toBe(false);
        expect(button.getAttribute('aria-busy')).toBe('false');
        expect(button.querySelector('[aria-hidden="false"]')?.textContent.trim()).toBe('Проверить оплату');
        fixture.destroy();
    }));

    it('does not change the button during automatic polling and reuses that request after a manual click', fakeAsync(() => {
        const response = new Subject<PaymentStateDto>();

        getState.mockReturnValue(response);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(0);
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-busy]');

        tick(1000);
        fixture.detectChanges();
        expect(fixture.componentInstance.stateRequest.loading()).toBe(true);
        expect(button.disabled).toBe(false);
        expect(button.getAttribute('aria-busy')).toBe('false');
        button.click();
        fixture.detectChanges();
        expect(button.disabled).toBe(true);
        expect(button.getAttribute('aria-busy')).toBe('true');
        expect(getState).toHaveBeenCalledTimes(1);
        response.next(pendingState);
        response.complete();
        fixture.detectChanges();
        tick(500);
        fixture.detectChanges();
        expect(button.disabled).toBe(false);
        fixture.destroy();
    }));

    it.each(['route', 'logout'])('clears manual progress and its timer after %s', fakeAsync((context: string) => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(0);
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();
        expect(fixture.componentInstance.showPaymentCheckProgress()).toBe(true);

        if (context === 'route') {
            getOrder.mockReturnValue(of({ ...stored, id: 99 }));
            routeParams.next(convertToParamMap({ id: '99' }));
        } else {
            authenticated.set(false);
            auth.sessionRevision++;
        }

        fixture.detectChanges();
        expect(fixture.componentInstance.showPaymentCheckProgress()).toBe(false);
        tick(500);
        expect(fixture.componentInstance.showPaymentCheckProgress()).toBe(false);
        fixture.destroy();
    }));

    it('shows a late capture incident without granting success', () => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        getState.mockReturnValue(of({
            orderId: 17, orderStatus: EnumOrderStatus.Cancel, paymentStatus: EnumPaymentStatus.SUCCEEDED,
            resolution: 'compensation_required', checkedAt: new Date(), verificationUnavailable: false,
        }));
        fixture.componentInstance.checkPayment();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Оплата сохранена для проверки');
        expect(fixture.nativeElement.textContent).not.toContain('Оплата подтверждена');
        expect(purchaseConfirmed).not.toHaveBeenCalled();
    });

    it('ignores a status response after logout', () => {
        const response = new Subject();

        getState.mockReturnValue(response);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        fixture.componentInstance.checkPayment();
        authenticated.set(false);
        auth.sessionRevision++;
        fixture.detectChanges();
        response.next({ orderId: 17, orderStatus: EnumOrderStatus.Success });
        expect(fixture.componentInstance.order()).toBeNull();
        expect(purchaseConfirmed).not.toHaveBeenCalled();
    });

    it('polls the backend for two minutes and never takes success from return parameters', fakeAsync(() => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(120_000);
        expect(getState).toHaveBeenCalledTimes(24);
        expect(purchaseConfirmed).not.toHaveBeenCalled();
        expect(fixture.componentInstance.order()?.status).toBe(EnumOrderStatus.PendingPayment);
        tick(30_000);
        expect(getState).toHaveBeenCalledTimes(24);
        fixture.destroy();
    }));

    it('ignores an automatic status response after switching accounts without an intermediate logout', fakeAsync(() => {
        const response = new Subject();

        getState.mockReturnValue(response);

        const fixture = TestBed.createComponent(OrderDetailsComponent);

        fixture.detectChanges();
        tick(0);
        auth.sessionRevision++;
        accessToken.set('another-account');
        getOrder.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
        response.next({ orderId: 17, orderStatus: EnumOrderStatus.Success, resolution: 'completed' });
        fixture.detectChanges();
        expect(fixture.componentInstance.order()).toBeNull();
        expect(purchaseConfirmed).not.toHaveBeenCalled();
        fixture.destroy();
    }));

});
