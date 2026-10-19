import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AdminOrderResponseDto, ApiAdminProducer } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { LocalCartService } from './sources/local-cart.service';
import { UserCartService } from './sources/user-cart.service';
import { MajorCartService } from './major-cart.service';
import { CartItemModel, DEFAULT_CART_PRICE } from './order.misc';


describe('MajorCartService.replaceCart', () => {
    const products: CartItemModel[] = [
        { pattern: 7, sizes: [3, 5], color: true, requiresPatternPurchase: true },
        { pattern: 8, sizes: [4], color: false, requiresPatternPurchase: true },
    ];
    let service: MajorCartService;
    let clear: Subject<null>;
    let firstAdd: Subject<AdminOrderResponseDto>;
    let secondAdd: Subject<AdminOrderResponseDto>;
    let producer: {
        adminCartControllerLastOrder: jest.Mock;
        adminCartControllerClearAll: jest.Mock;
        adminCartControllerAddItemToOrder: jest.Mock;
    };

    function response(items: CartItemModel[]): AdminOrderResponseDto {
        return {
            price: { ru: items.length * 100, en: items.length },
            order: {
                id: 10,
                isComplete: false,
                patterns: items.map((item, index) => ({
                    ...item,
                    id: index + 1,
                    pattern: { id: item.pattern },
                    sizes: item.sizes.map((id) => ({ id, size: { id } })),
                })),
            },
        } as AdminOrderResponseDto;
    }

    beforeEach(() => {
        clear = new Subject();
        firstAdd = new Subject();
        secondAdd = new Subject();
        producer = {
            adminCartControllerLastOrder: jest.fn().mockReturnValue(of(response([products[1]]))),
            adminCartControllerClearAll: jest.fn().mockReturnValue(clear),
            adminCartControllerAddItemToOrder: jest.fn()
                .mockReturnValueOnce(firstAdd)
                .mockReturnValueOnce(secondAdd),
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: ApiAdminProducer, useValue: producer },
                { provide: ProfileService, useValue: { isAdmin: signal(true) } },
                { provide: AuthService, useValue: { auth: signal(false) } },
                { provide: LocalCartService, useValue: {} },
                { provide: UserCartService, useValue: {} },
                { provide: SnackService, useValue: { warn: jest.fn() } },
            ],
        });
        service = TestBed.inject(MajorCartService);
        TestBed.tick();
    });

    it('waits for clearing and each addition, then reports success once with the full cart', () => {
        const next = jest.fn();
        service.replaceCart(products).subscribe(next);

        expect(producer.adminCartControllerAddItemToOrder).not.toHaveBeenCalled();
        clear.next(null);
        expect(service.cart()).toEqual([]);
        expect(service.price()).toEqual(DEFAULT_CART_PRICE);
        expect(producer.adminCartControllerAddItemToOrder).not.toHaveBeenCalled();
        clear.complete();

        expect(producer.adminCartControllerAddItemToOrder).toHaveBeenNthCalledWith(1, products[0]);
        firstAdd.next(response([products[0]]));
        expect(producer.adminCartControllerAddItemToOrder).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
        firstAdd.complete();

        expect(producer.adminCartControllerAddItemToOrder).toHaveBeenNthCalledWith(2, products[1]);
        secondAdd.next(response(products));
        expect(next).not.toHaveBeenCalled();
        secondAdd.complete();

        expect(service.cart()).toEqual(products.map((item) => expect.objectContaining(item)));
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('keeps the current cart and adds nothing if clearing fails', () => {
        const previousCart = service.cart();
        const error = new Error('Cannot clear the cart');
        const onError = jest.fn();
        service.replaceCart(products).subscribe({ error: onError });
        clear.error(error);

        expect(service.cart()).toBe(previousCart);
        expect(onError).toHaveBeenCalledWith(error);
        expect(producer.adminCartControllerAddItemToOrder).not.toHaveBeenCalled();
    });

    it('stops copying and reports an error if adding a product fails', () => {
        const next = jest.fn();
        const onError = jest.fn();
        service.replaceCart(products).subscribe({ next, error: onError });
        clear.next(null);
        clear.complete();
        firstAdd.error(new Error('Product is unavailable'));

        expect(onError).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
        expect(producer.adminCartControllerAddItemToOrder).toHaveBeenCalledTimes(1);
    });

    it('can replace the cart with an empty order', () => {
        const next = jest.fn();
        service.replaceCart([]).subscribe(next);
        clear.next(null);
        clear.complete();

        expect(service.cart()).toEqual([]);
        expect(next).toHaveBeenCalledTimes(1);
        expect(producer.adminCartControllerAddItemToOrder).not.toHaveBeenCalled();
    });
});
