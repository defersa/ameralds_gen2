import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { ApiOrdersProducer, EnumOrderStatus } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { CategoriesService } from '@am-front/services/categories.service';
import { OrderDetailsComponent } from './order-details.component';


describe('personal order page', () => {
    const authenticated = signal(true);
    const getOrder = jest.fn();

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
        jest.clearAllMocks();
        getOrder.mockReturnValue(of(stored));
        TestBed.configureTestingModule({ imports: [OrderDetailsComponent], providers: [
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '17' })) } },
            { provide: AuthService, useValue: { auth: authenticated } },
            { provide: ApiOrdersProducer, useValue: { userOrdersControllerGetOrder: getOrder } },
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

        const pay = fixture.debugElement.query(By.directive(AmstoreButtonComponent));

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
});
