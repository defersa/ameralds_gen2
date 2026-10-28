import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiOrdersProducer } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { OrderDetailsComponent } from './order-details.component';

describe('personal order page', () => {
    const authenticated = signal(true);
    const getOrder = jest.fn();
    beforeEach(() => {
        authenticated.set(true);
        jest.clearAllMocks();
        getOrder.mockReturnValue(of({ id: 17, patterns: [{ id: 31, name: { ru: 'Волны' }, images: [], sizes: [{ id: 21, size: { value: 36 } }], color: true }] }));
        TestBed.configureTestingModule({ imports: [OrderDetailsComponent], providers: [
            provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '17' })) } },
            { provide: AuthService, useValue: { auth: authenticated } }, { provide: ApiOrdersProducer, useValue: { userOrdersControllerGetOrder: getOrder } },
        ] });
    });
    it('loads the order from its route and shows the selected purchase options', () => {
        const fixture = TestBed.createComponent(OrderDetailsComponent);
        fixture.detectChanges();
        expect(getOrder).toHaveBeenCalledWith(17);
        expect(fixture.nativeElement.textContent).toContain('Заказ №17');
        expect(fixture.nativeElement.textContent).toContain('Волны');
        expect(fixture.nativeElement.textContent).toContain('36');
        expect(fixture.nativeElement.textContent).toContain('включён');
    });
    it('does not request personal orders without authentication', () => {
        authenticated.set(false);
        const fixture = TestBed.createComponent(OrderDetailsComponent);
        fixture.detectChanges();
        expect(getOrder).not.toHaveBeenCalled();
        expect(fixture.componentInstance.order()).toBeNull();
    });
});
