import { effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { LocalStorage } from '@am-front/decorators/local.decorator';
import { parseJsonWithDefault } from '@am-front/utils/common.utils';
import {
    NumberEntityDto,
    ApiOrdersProducer,
} from '@am-front/root/api-v2';
import { SnackService } from '@am-front/services/snackbar.service';
import { DEFAULT_CART_PRICE } from '@am-front/services/cart/default.data';


const LOCAL_PATTERN_CART_NAME = 'LOCAL_CART';

export interface CartItem {
    pattern: number;
    sizes: number[];
    requiresPatternPurchase: boolean;
    color: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LocalCartService {
    @LocalStorage(LOCAL_PATTERN_CART_NAME)
    private storagePatternCart!: string;

    private readonly snack: SnackService = inject(SnackService);
    private readonly ordersProducer: ApiOrdersProducer = inject(ApiOrdersProducer);

    public cart: WritableSignal<Record<number, CartItem>> = signal(parseJsonWithDefault(this.storagePatternCart, {}));
    public prices: WritableSignal<null | NumberEntityDto> = signal(null);

    constructor() {
        effect(() => {
            const cart: Record<number, CartItem> = this.cart();

            this.storagePatternCart = JSON.stringify(cart);
            this.updatePrice();
        });
    }

    public addProduct(item: CartItem): void {
        const preparedItem: CartItem = {
            ...item,
            requiresPatternPurchase: true
        };

        if (!preparedItem.pattern || !preparedItem.sizes?.length) {
            this.snack.warn('Товар недоступен');

            return;
        }

        this.cart.set({
            ...this.cart(),
            [item.pattern]: preparedItem
        });
    }

    public removeProduct(item: CartItem): void {
        const cart: Record<number, CartItem> = { ...this.cart() };

        delete cart[item.pattern];

        this.cart.set(cart);
    }

    public clearCart(): void {
        this.cart.set({});
    }

    public updatePrice(cart: Record<number, CartItem> = {}): void {
        if (Object.keys(cart).length === 0) {
            this.prices.set(DEFAULT_CART_PRICE);

            return;
        }

        this.prices.set(null);

        this.ordersProducer
            .ordersControllerLocalCartPrice(Object.values(cart))
            .subscribe({
                next: (price: NumberEntityDto) => {
                    this.prices.set(price);
                },
                error: () => {
                    this.snack.warn('Часть товаров не доступна');
                    this.prices.set(DEFAULT_CART_PRICE);
                    this.cart.set({});
                },
            });
    }
}
