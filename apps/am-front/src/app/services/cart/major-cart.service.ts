import { computed, effect, inject, Injectable, Signal } from '@angular/core';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { LocalCartService } from '@am-front/services/cart/sources/local-cart.service';
import { UserCartService } from '@am-front/services/cart/sources/user-cart.service';
import { AdminCartService } from '@am-front/services/cart/sources/admin-cart.service';
import { CartItemModel } from '@am-front/services/cart/order.misc';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';
import { NumberEntityDto } from '@am-front/root/api-v2';


export type CartType = 'local' | 'user' | 'admin';

@Injectable({
    providedIn: 'root'
})
export class MajorCartService {
    private authService: AuthService = inject(AuthService);
    private profileService: ProfileService = inject(ProfileService);
    private localCartService: LocalCartService = inject(LocalCartService);
    private userCartService: UserCartService = inject(UserCartService);
    private adminCartService: AdminCartService = inject(AdminCartService);

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

    constructor() {
        this.initLocalCartListener();
    }

    public price: Signal<null | NumberEntityDto> = computed(() => {
        return this.currentCartService().price();
    });

    public cart: Signal<CartItemModel[]> = computed(() => {
        return this.currentCartService().cart();
    });

    public addProduct(product: CartItemModel): void {
        this.currentCartService().addProduct(product);
    }

    public removeProduct(id: number): void {
        this.currentCartService().removeProduct(id);
    }

    public clearCart(): void {
        this.currentCartService().clearCart();
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

                this.localCartService.clearCart();
            }

            previous = this.currentCartName();
        });
    }
}
