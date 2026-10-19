import { Location } from '@angular/common';
import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AdminOrderDetailsDto, AdminOrderDetailsPatternDto, FullPatternEntityDto } from '@am-front/root/api-v2';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AdminOrdersService } from '@am-front/services/admin-orders.service';
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { AmstorePatternCardComponent } from '@am-front/shared/card/pattern/pattern.component';
import { PatternAdminDownloadComponent } from '@am-front/shared/details/pattern-admin-download/pattern-admin-download.component';
import { CardComponent } from './card.component';


@Component({ selector: 'amstore-pattern-card', template: '<ng-content />' })
class PatternCardStub {
    public readonly pattern = input<FullPatternEntityDto>();
}

@Component({ selector: 'amstore-pattern-admin-download', template: '' })
class PatternAdminDownloadStub {
    public readonly orderId = input.required<number>();
    public readonly orderPattern = input.required<AdminOrderDetailsPatternDto>();
}

describe('Admin order card actions', () => {
    let fixture: ComponentFixture<CardComponent>;
    let component: CardComponent;
    let order: AdminOrderDetailsDto;
    let resend: Subject<void>;
    let copy: Subject<void>;
    let ordersService: { getOrder: jest.Mock; resendOrderEmail: jest.Mock };
    let cartService: { replaceCart: jest.Mock };
    let snack: { open: jest.Mock; warn: jest.Mock };

    beforeEach(async () => {
        order = {
            id: 42,
            email: 'buyer@example.com',
            isComplete: true,
            patterns: [{
                id: 31,
                color: true,
                requiresPatternPurchase: true,
                sizes: [{ id: 21, size: { id: 3, value: 36 } }, { id: 22, size: { id: 5, value: 40 } }],
                pattern: {
                    id: 7,
                    basePrice: { ru: 100, en: 1 },
                    additionalPrice: { ru: 50, en: 0.5 },
                    colorPrice: { ru: 25, en: 0.25 },
                },
            }],
        } as AdminOrderDetailsDto;
        resend = new Subject();
        copy = new Subject();
        ordersService = {
            getOrder: jest.fn().mockReturnValue(of(order)),
            resendOrderEmail: jest.fn().mockReturnValue(resend),
        };
        cartService = { replaceCart: jest.fn().mockReturnValue(copy) };
        snack = { open: jest.fn(), warn: jest.fn() };
        await TestBed.configureTestingModule({
            imports: [CardComponent],
            providers: [
                { provide: Location, useValue: { back: jest.fn() } },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '42' })) } },
                { provide: AdminOrdersService, useValue: ordersService },
                { provide: MajorCartService, useValue: cartService },
                { provide: SnackService, useValue: snack },
            ],
        }).overrideComponent(CardComponent, {
            remove: { imports: [AmstorePatternCardComponent, PatternAdminDownloadComponent] },
            add: { imports: [PatternCardStub, PatternAdminDownloadStub] },
        }).compileComponents();
        fixture = TestBed.createComponent(CardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('shows the three actions and keeps downloading disabled', () => {
        const buttons = fixture.debugElement.queryAll(By.directive(AmstoreButtonComponent));

        expect(buttons.map((button) => button.nativeElement.textContent.trim())).toEqual([
            'Назад', 'Отправить заново', 'Скопировать в корзину', 'Скачать',
        ]);
        expect(buttons[3].componentInstance.disabled()).toBe(true);
    });

    it('projects downloads with the order ID and selected sizes into the pattern card', () => {
        const card = fixture.debugElement.query(By.directive(PatternCardStub));
        const downloads = card.query(By.directive(PatternAdminDownloadStub)).componentInstance;

        expect(downloads.orderId()).toBe(42);
        expect(downloads.orderPattern()).toBe(order.patterns[0]);
    });

    it('does not show downloads for an incomplete order', () => {
        component.adminOrder.set({ ...order, isComplete: false });
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.directive(PatternAdminDownloadStub))).toBeNull();
    });

    it('resends the displayed order once and disables actions until the request finishes', () => {
        const resendButton = fixture.debugElement.queryAll(By.directive(AmstoreButtonComponent))[1];
        resendButton.triggerEventHandler('click');
        component.resendOrderEmail();
        fixture.detectChanges();

        expect(ordersService.resendOrderEmail).toHaveBeenCalledTimes(1);
        expect(ordersService.resendOrderEmail).toHaveBeenCalledWith(42);
        expect(resendButton.componentInstance.disabled()).toBe(true);
        expect(snack.open).not.toHaveBeenCalled();

        resend.next(undefined);
        resend.complete();

        expect(component.resending()).toBe(false);
        expect(snack.open).toHaveBeenCalledWith('Письмо отправлено повторно');
    });

    it('copies the selected sizes and color through MajorCartService without changing the order', () => {
        const originalOrder = JSON.stringify(order);
        const copyButton = fixture.debugElement.queryAll(By.directive(AmstoreButtonComponent))[2];
        copyButton.triggerEventHandler('click');
        component.copyToCart();

        expect(cartService.replaceCart).toHaveBeenCalledTimes(1);
        expect(cartService.replaceCart).toHaveBeenCalledWith([
            expect.objectContaining({ pattern: 7, sizes: [3, 5], color: true, requiresPatternPurchase: true }),
        ]);
        expect(component.copying()).toBe(true);
        expect(snack.open).not.toHaveBeenCalled();

        copy.next(undefined);
        copy.complete();

        expect(component.copying()).toBe(false);
        expect(JSON.stringify(order)).toBe(originalOrder);
        expect(snack.open).toHaveBeenCalledWith('Состав заказа скопирован в корзину');
    });

    it('keeps the current cart intact if an ordered pattern has been deleted', () => {
        component.adminOrder.set({ ...order, patterns: [{ ...order.patterns[0], pattern: null }] });
        component.copyToCart();

        expect(component.canCopyToCart()).toBe(false);
        expect(cartService.replaceCart).not.toHaveBeenCalled();
    });

    it('does not resend orders without an email or copy an incomplete order', () => {
        component.adminOrder.set({ ...order, email: '   ' });
        component.resendOrderEmail();
        expect(ordersService.resendOrderEmail).not.toHaveBeenCalled();

        component.adminOrder.set({ ...order, isComplete: false });
        component.copyToCart();
        component.resendOrderEmail();
        expect(cartService.replaceCart).not.toHaveBeenCalled();
        expect(ordersService.resendOrderEmail).not.toHaveBeenCalled();
    });

    it.each(['resend', 'copy'])('shows a failure and allows retrying the %s action', (action) => {
        if (action === 'resend') {
            component.resendOrderEmail();
            resend.error(new Error('SMTP unavailable'));
        } else {
            component.copyToCart();
            copy.error(new Error('Cart unavailable'));
        }

        expect(component.actionPending()).toBe(false);
        expect(snack.warn).toHaveBeenCalledTimes(1);
        expect(snack.open).not.toHaveBeenCalled();
    });
});
