import { DestroyRef, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
    NumberEntityDto,
    ApiOrdersProducer,
    CartDto,
    CartOrderPatternDto
} from '@am-front/root/api-v2';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CartItemModel, DEFAULT_CART_PRICE } from '@am-front/services/cart/order.misc';
import { AuthService } from '@am-front/services/auth.service';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';


@Injectable({
    providedIn: "root"
})
export class UserCartService extends AbstractCartService {
    private authService: AuthService = inject(AuthService);
    private orderProducer: ApiOrdersProducer = inject(ApiOrdersProducer);
    private destroyRef: DestroyRef = inject(DestroyRef);

    public readonly cart: WritableSignal<CartItemModel[]> = signal(null);
    public readonly price: WritableSignal<NumberEntityDto> = signal(null);

    constructor() {
        super();

        effect(() => {
            if (!this.authService.auth()) {
                this.cart.set(null);
                this.price.set(DEFAULT_CART_PRICE);

                return;
            }

            this.getActualCart()
        });
    }

    public getActualCart(): void {
        this.price.set(null);

        this.orderProducer.ordersControllerCart()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    public addProduct(pattern: CartItemModel): void {
        this.orderProducer.ordersControllerAddItemToCart(pattern)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    public removeProduct(id: number): void {
        this.orderProducer.ordersControllerRemoveItemFromCart(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    public clearCart(): void {
        this.orderProducer.ordersControllerClearAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    public mergeLocalCart(patterns: CartItemModel[]): void {
        this.orderProducer.ordersControllerMergeLocalCart(patterns)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    private updateCartAndPrice(cart: CartDto): void {
        this.price.set(cart.price);
        this.cart.set(
            cart.cart.patterns.map((pattern: CartOrderPatternDto) => ({
                ...pattern,
                pattern: pattern.pattern.id,
                sizes: pattern.sizes.map((size: CartOrderPatternDto) => size.id),
            })),
        );
    }
}
