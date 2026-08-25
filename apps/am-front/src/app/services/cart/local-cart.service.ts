import { computed, DestroyRef, effect, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { LocalStorage } from '@am-front/decorators/local.decorator';
import { PatternsService } from '@am-front/services/patterns.service';
import { parseJsonWithDefault } from '@am-front/utils/common.utils';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import {
    InputShortOrderPatternDto,
    NumberEntityDto,
    ApiOrdersProducer,
    PatternEntityDto, type PatternWithPriceDto,
    ShortOrderPatternDto,
    type UserOrderDto,
    UserProfileDto, LocalCartDto
} from '@am-front/root/api-v2';
import { ProfileService } from '@am-front/services/profile.service';
import { debounceTime, filter, map, shareReplay, skip, switchMap, takeUntil } from 'rxjs/operators';
import { IdRecord } from '@am-front/interface/common.interface';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LangService, LangType } from '@am-front/services/lang.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { OrdersService } from '@am-front/root/layouts/account/services/orders.service';


const LOCAL_PATTERN_CART_NAME: string = 'LOCAL_CART';
const DEFAULT_CART_PRICE: LocalCartDto = {
    patterns: [],
    totalPrice: { en: 0, ru: 0 },
};

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
    public prices: WritableSignal<null | LocalCartDto> = signal(null);

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
            this.prices.set({
                patterns: [],
                totalPrice: { en: 0, ru: 0 },
            });

            return;
        }

        this.prices.set(null);

        this.ordersProducer
            .ordersControllerLocalCartPrice(Object.values(cart))
            .subscribe({
                next: (price: LocalCartDto) => {
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
