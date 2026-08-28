import { DestroyRef, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ProfileService } from '@am-front/services/profile.service';
import {
    AdminOrderPatternDto,
    AdminOrderPatternSizeDto,
    AdminOrderResponseDto,
    ApiAdminProducer,
    NumberEntityDto,
} from '@am-front/root/api-v2';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartItemModel, DEFAULT_CART_PRICE } from '@am-front/services/cart/order.misc';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';


@Injectable({
    providedIn: 'root'
})
export class AdminCartService extends AbstractCartService {
    private profileService: ProfileService = inject(ProfileService);
    private adminProducer: ApiAdminProducer = inject(ApiAdminProducer);
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

            this.getActualAdminCart()
        });
    }

    public getActualAdminCart(): void {
        this.price.set(null);

        this.adminProducer.adminCartControllerLastOrder()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: AdminOrderResponseDto) => this.updateCartAndPrice(order));
    }

    public addProduct(product: CartItemModel): void {
        this.adminProducer.adminCartControllerAddItemToOrder({
            ...product,
            requiresPatternPurchase: true,
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: AdminOrderResponseDto) => this.updateCartAndPrice(order));
    }

    public removeProduct(id: number): void {
        this.adminProducer.adminCartControllerRemoveItemFromCart(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: AdminOrderResponseDto) => this.updateCartAndPrice(order));
    }

    public clearCart(): void {
        this.adminProducer.adminCartControllerClearAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: AdminOrderResponseDto) => this.updateCartAndPrice(order));
    }

    private updateCartAndPrice(cart: AdminOrderResponseDto): void {
        this.price.set(cart.price);
        this.cart.set(
            cart.order.patterns.map((pattern: AdminOrderPatternDto) => ({
                ...pattern,
                pattern: pattern.pattern.id,
                sizes: pattern.sizes.map((size: AdminOrderPatternSizeDto) => size.id),
            })),
        );
    }
}
