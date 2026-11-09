import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiOrdersProducer, CartDto, EnumOrderStatus } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { UserCartService } from './user-cart.service';


describe('UserCartService', () => {
    const selection = { pattern: 7, sizes: [1], color: true, requiresPatternPurchase: false };
    const response: CartDto = {
        revision: "a".repeat(64),
        correctedPatternIds: [7],
        price: { ru: 0, en: 0 },
        cart: { id: 5, createdAt: new Date(), updatedAt: new Date(), status: EnumOrderStatus.Open, patterns: [] },
    };
    const auth = signal(true);
    let service: UserCartService;
    let producer: Record<
        'ordersControllerCart' | 'ordersControllerAddItemToCart' | 'ordersControllerRemoveItemFromCart' |
        'ordersControllerMergeLocalCart' | 'ordersControllerClearAll', jest.Mock
    >;
    let snack: { open: jest.Mock; warn: jest.Mock };

    beforeEach(() => {
        auth.set(true);
        producer = {
            ordersControllerCart: jest.fn().mockReturnValue(of({ ...response, correctedPatternIds: [] })),
            ordersControllerAddItemToCart: jest.fn().mockReturnValue(of(response)),
            ordersControllerRemoveItemFromCart: jest.fn().mockReturnValue(of(response)),
            ordersControllerMergeLocalCart: jest.fn().mockReturnValue(of(response)),
            ordersControllerClearAll: jest.fn().mockReturnValue(of(response)),
        };
        snack = { open: jest.fn(), warn: jest.fn() };
        TestBed.configureTestingModule({ providers: [
            { provide: AuthService, useValue: { auth } },
            { provide: ApiOrdersProducer, useValue: producer },
            { provide: SnackService, useValue: snack },
        ] });
        service = TestBed.inject(UserCartService);
        TestBed.tick();
    });

    it('accepts complete removal and explains correction instead of restoring the submitted choice', () => {
        service.addProduct(selection).subscribe();

        expect(service.cart()).toEqual([]);
        expect(snack.open).toHaveBeenCalledWith(expect.stringContaining('Полностью купленные позиции удалены'));
    });

    it('returns success for a fully purchased local cart after merge', () => {
        const next = jest.fn();

        service.mergeLocalCart([selection]).subscribe(next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(service.cart()).toEqual([]);
    });

    it('does not report merge success on failure and allows retry', () => {
        producer.ordersControllerMergeLocalCart.mockReturnValueOnce(throwError(() => new Error('offline')));
        const next = jest.fn();

        service.mergeLocalCart([selection]).subscribe(next);
        TestBed.tick();
        expect(next).not.toHaveBeenCalled();
        expect(snack.warn).toHaveBeenCalled();

        service.mergeLocalCart([selection]).subscribe(next);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('loads once after login and sends no user requests after logout', () => {
        TestBed.tick();
        expect(producer.ordersControllerCart).toHaveBeenCalledTimes(1);
        auth.set(false);
        TestBed.tick();
        service.addProduct(selection).subscribe();
        service.mergeLocalCart([selection]).subscribe();
        service.getActualCart();

        expect(producer.ordersControllerAddItemToCart).not.toHaveBeenCalled();
        expect(producer.ordersControllerMergeLocalCart).not.toHaveBeenCalled();
        expect(producer.ordersControllerCart).toHaveBeenCalledTimes(1);
    });
});
