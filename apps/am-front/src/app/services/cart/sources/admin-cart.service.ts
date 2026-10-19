import { DestroyRef, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ProfileService } from '@am-front/services/profile.service';
import {
    AdminOrderResponseDto,
    ApiAdminProducer,
    NumberEntityDto,
} from '@am-front/root/api-v2';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    CartItemModel,
    convertOrderPatternEntityToCartItem,
    DEFAULT_CART_PRICE
} from '@am-front/services/cart/order.misc';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { map, Observable, tap } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class AdminCartService extends AbstractCartService {
    private profileService: ProfileService = inject(ProfileService);
    private adminProducer: ApiAdminProducer = inject(ApiAdminProducer);
    private snackService: SnackService = inject(SnackService);
    private destroyRef: DestroyRef = inject(DestroyRef);

    public readonly cart: WritableSignal<CartItemModel[]> = signal(null);
    public readonly price: WritableSignal<NumberEntityDto> = signal(null);

    constructor() {
        super();

        effect(() => {
            if (!this.profileService.isAdmin()) {
                this.cart.set(null);
                this.price.set(DEFAULT_CART_PRICE);

                return;
            }

            this.getActualAdminCart();
        });
    }

    public getActualAdminCart(): void {
        this.price.set(null);

        this.adminProducer.adminCartControllerLastOrder()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (order: AdminOrderResponseDto) => this.updateCartAndPrice(order),
                error: () => this.snackService.warn('Не удалось обновить корзину'),
            });
    }

    public addProduct(product: CartItemModel): Observable<void> {
        return this.adminProducer.adminCartControllerAddItemToOrder({
            ...product,
            requiresPatternPurchase: true,
        })
            .pipe(
                tap((order: AdminOrderResponseDto) => this.updateCartAndPrice(order)),
                map(() => undefined),
            );
    }

    public removeProduct(id: number): void {
        this.adminProducer.adminCartControllerRemoveItemFromCart(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: AdminOrderResponseDto) => this.updateCartAndPrice(order));
    }

    public clearCart(): Observable<void> {
        return this.adminProducer.adminCartControllerClearAll()
            .pipe(
                tap(() => {
                    this.cart.set([]);
                    this.price.set(DEFAULT_CART_PRICE);
                }),
                map(() => undefined),
            );
    }

    private updateCartAndPrice(cart: AdminOrderResponseDto): void {
        this.price.set(cart.price);
        this.cart.set(
            cart.order.patterns.map(convertOrderPatternEntityToCartItem),
        );
    }
}
