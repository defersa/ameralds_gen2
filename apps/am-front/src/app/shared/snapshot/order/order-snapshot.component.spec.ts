import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnumOrderStatus, UserOrderSummaryDto } from '@am-front/root/api-v2';
import { OrderSnapshotComponent } from './order-snapshot.component';


describe('OrderSnapshotComponent', () => {
    let fixture: ComponentFixture<OrderSnapshotComponent>;

    const order = {
        id: 17,
        status: EnumOrderStatus.PendingPayment,
        createdAt: new Date('2026-11-08T10:00:00Z'),
        updatedAt: new Date('2026-11-09T12:00:00Z'),
        placedAt: new Date('2026-11-09T12:00:00Z'),
        subtotalAmount: 12345,
        discountAmount: 0,
        totalAmount: 12345,
        currency: 'RUB',
        paymentExpiresAt: new Date('2026-11-16T12:00:00Z'),
        paidAt: null,
        cancelledAt: null,
        cancelReason: null,
        appSettingsVersion: 1,
    } satisfies UserOrderSummaryDto;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [OrderSnapshotComponent],
            providers: [provideRouter([])],
        });

        fixture = TestBed.createComponent(OrderSnapshotComponent);
        fixture.componentRef.setInput('order', order);
        fixture.detectChanges();
    });

    it('shows the checkout date, minor-unit price and a native details link without a tracking number', () => {
        const element: HTMLElement = fixture.nativeElement;
        const link = element.querySelector('a');

        expect(element.textContent).toContain('Заказ №17');
        expect(element.textContent).toContain('09.11.2026');
        expect(element.textContent).not.toContain('08.11.2026');
        expect(element.textContent).toContain('123.45');
        expect(element.textContent).toContain('₽');
        expect(element.textContent).not.toMatch(/Трек|Собирается/);
        expect(link?.getAttribute('href')).toBe('/account/orders/17');
        expect(link?.getAttribute('aria-label')).toBe('Подробнее о заказе №17');
    });

    it.each([
        {
            status: EnumOrderStatus.Open,
            label: 'Корзина',
            icon: 'time',
        },
        {
            status: EnumOrderStatus.PendingPayment,
            label: 'Ожидает оплаты',
            icon: 'time',
        },
        {
            status: EnumOrderStatus.Success,
            label: 'Оплачен',
            icon: 'apply',
        },
        {
            status: EnumOrderStatus.Cancel,
            label: 'Отменён',
            icon: 'warn',
        },
        {
            status: EnumOrderStatus.PartiallyRefunded,
            label: 'Частичный возврат',
            icon: 'warn',
        },
        {
            status: EnumOrderStatus.Refunded,
            label: 'Возврат',
            icon: 'warn',
        },
    ])('renders the current status $status and updates when the input changes', ({ status, label, icon }) => {
        fixture.componentRef.setInput('order', { ...order, status });
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement;

        expect(element.textContent).toContain(label);
        expect(fixture.componentInstance.appearance().icon).toBe(icon);
    });

    it('preserves zero and supports dollars', () => {
        fixture.componentRef.setInput('order', { ...order, totalAmount: 0, currency: 'USD' });
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement;

        expect(element.textContent).toContain('0.00');
        expect(element.textContent).toContain('$');
        expect(element.textContent).not.toContain('Неизвестна');
    });

    it('preserves an unknown historical price and uses creation time when checkout time is absent', () => {
        fixture.componentRef.setInput('order', {
            ...order,
            placedAt: null,
            totalAmount: null,
            currency: null,
        });
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement;

        expect(element.textContent).toContain('Неизвестна');
        expect(element.textContent).not.toContain('0.00');
        expect(element.textContent).toContain('08.11.2026');
    });
});
