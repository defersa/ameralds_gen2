import { computed, DestroyRef, effect, inject, Injectable, Signal } from '@angular/core';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { LocalCartService } from '@am-front/services/cart/sources/local-cart.service';
import { UserCartService } from '@am-front/services/cart/sources/user-cart.service';
import { AdminCartService } from '@am-front/services/cart/sources/admin-cart.service';
import { CartItemModel, convertOrderPatternEntityToCartItem } from '@am-front/services/cart/order.misc';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';
import { NumberEntityDto, UserProfilePatternDto } from '@am-front/root/api-v2';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concat, defer, last, Observable } from 'rxjs';
import { SnackService } from '@am-front/services/snackbar.service';


export type CartType = 'local' | 'user' | 'admin';

@Injectable({
    providedIn: 'root'
})
export class MajorCartService {
    private readonly authService: AuthService = inject(AuthService);
    private readonly profileService: ProfileService = inject(ProfileService);
    private readonly localCartService: LocalCartService = inject(LocalCartService);
    private readonly userCartService: UserCartService = inject(UserCartService);
    private readonly adminCartService: AdminCartService = inject(AdminCartService);
    private readonly snackService: SnackService = inject(SnackService);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    public currentCartName: Signal<CartType> = computed(() => {
        if (this.profileService.isAdmin()) {
            return 'admin';
        }

        if (this.authService.auth()) {
            return 'user';
        }

        return 'local';
    });

    public currentCartService: Signal<AbstractCartService> = computed(() => {
        switch (this.currentCartName()) {
            case 'admin':
                return this.adminCartService;
            case 'user':
                return this.userCartService;
            default:
                return this.localCartService;

        }
    });

    public boughtPatterns: Signal<Record<number, CartItemModel>> = computed(() => {
        if (this.currentCartName() === 'user') {
            const boughtPatterns: CartItemModel[] = this.profileService
                .boughtPatterns()
                // Pattern already bought
                .map((item: UserProfilePatternDto) => ({...item, requiresPatternPurchase: true }))
                .map(convertOrderPatternEntityToCartItem);

            return Object.fromEntries(
                boughtPatterns.map((item: CartItemModel) => [item.pattern, item]),
            );
        }

        return [];
    });

    constructor() {
        this.initLocalCartListener();
    }

    public price: Signal<null | NumberEntityDto> = computed(() => {
        return this.currentCartService().price();
    });

    public cart: Signal<CartItemModel[]> = computed(() => {
        return this.currentCartService().cart();
    });

    public cartById: Signal<Record<number, CartItemModel>> = computed(() => {
        return Object.fromEntries(
            (this.cart() ?? []).map((item: CartItemModel) => [item.pattern, item]),
        );
    });

    public addProduct(product: CartItemModel): void {
        this.currentCartService().addProduct(product)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ error: () => this.snackService.warn('Не удалось добавить товар в корзину') });
    }

    public removeProduct(id: number): void {
        this.currentCartService().removeProduct(id);
    }

    public clearCart(): void {
        this.currentCartService().clearCart()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ error: () => this.snackService.warn('Не удалось очистить корзину') });
    }

    public replaceCart(products: CartItemModel[]): Observable<void> {
        return defer(() => {
            const cartService = this.currentCartService();

            return concat(
                cartService.clearCart(),
                ...products.map((product) => defer(() => cartService.addProduct(product))),
            ).pipe(last());
        });
    }

    private initLocalCartListener(): void {
        let previous: CartType;

        effect(() => {
            const current: CartType = this.currentCartName();

            if (previous === 'local') {
                const localCart: CartItemModel[] = this.localCartService.cart();

                if (current === 'user' && localCart.length > 0) {
                    this.userCartService.mergeLocalCart(localCart);
                }

                this.localCartService.clearCart().subscribe();
            }

            previous = this.currentCartName();
        });
    }
}
