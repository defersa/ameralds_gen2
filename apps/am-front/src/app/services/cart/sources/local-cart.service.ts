import { effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { LocalStorage } from '@am-front/decorators/local.decorator';
import { parseJsonWithDefault } from '@am-front/utils/common.utils';
import {
    NumberEntityDto,
    ApiOrdersProducer,
} from '@am-front/root/api-v2';
import { SnackService } from '@am-front/services/snackbar.service';
import { CartItemModel, DEFAULT_CART_PRICE } from '@am-front/services/cart/order.misc';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';


const LOCAL_PATTERN_CART_NAME = 'LOCAL_CART';

@Injectable({
    providedIn: 'root'
})
export class LocalCartService extends AbstractCartService {
    @LocalStorage(LOCAL_PATTERN_CART_NAME)
    private storagePatternCart!: string;

    private readonly snack: SnackService = inject(SnackService);
    private readonly ordersProducer: ApiOrdersProducer = inject(ApiOrdersProducer);

    public cart: WritableSignal<CartItemModel[]> = signal(parseJsonWithDefault(this.storagePatternCart, []));
    public price: WritableSignal<null | NumberEntityDto> = signal(null);

    constructor() {
        super();
        effect(() => {
            const cart: CartItemModel[] = this.cart();

            this.storagePatternCart = JSON.stringify(cart);
            this.updatePrice(cart);
        });
    }

    public addProduct(item: CartItemModel): void {
        const preparedItem: CartItemModel = {
            ...item,
            requiresPatternPurchase: true
        };

        if (!preparedItem.pattern || !preparedItem.sizes?.length) {
            this.snack.warn('Товар недоступен');

            return;
        }

        this.cart.set([
            ...this.cart().filter((product: CartItemModel) => product.pattern !== preparedItem.pattern),
            preparedItem
        ]);
    }

    public removeProduct(id: number): void {
        this.cart.set(this.cart().filter((product: CartItemModel) => product.pattern !== id));
    }

    public clearCart(): void {
        this.cart.set([]);
    }

    public updatePrice(cart: CartItemModel[]): void {
        if (cart.length === 0) {
            this.price.set(DEFAULT_CART_PRICE);

            return;
        }

        this.price.set(null);

        this.ordersProducer
            .localCartControllerLocalCartPrice(cart)
            .subscribe({
                next: (price: NumberEntityDto) => {
                    this.price.set(price);
                },
                error: () => {
                    this.snack.warn('Часть товаров не доступна');
                    this.price.set(DEFAULT_CART_PRICE);
                    this.cart.set([]);
                },
            });
    }
}
