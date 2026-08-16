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
    UserProfileDto
} from '@am-front/root/api-v2';
import { ProfileService } from '@am-front/services/profile.service';
import { debounceTime, filter, map, shareReplay, skip, switchMap, takeUntil } from 'rxjs/operators';
import { IdRecord } from '@am-front/interface/common.interface';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LangService, LangType } from '@am-front/services/lang.service';
import { SnackService } from '@am-front/services/snackbar.service';


const LOCAL_PATTERN_CART_NAME: string = 'LOCAL_CART';

export interface CartItem {
    pattern: number;
    sizes: number[];
    requiresPatternPurchase: boolean;
    color: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CartService {
    @LocalStorage(LOCAL_PATTERN_CART_NAME)
    private storagePatternCart!: string;

    private readonly snack: SnackService = inject(SnackService);
    private readonly patternsService: PatternsService = inject(PatternsService);

    public localCart: WritableSignal<Record<number, CartItem>> = signal(parseJsonWithDefault(this.storagePatternCart, {}));

    constructor() {
        effect(() => this.storagePatternCart = JSON.stringify(this.localCart()));
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

        this.localCart.set({
            ...this.localCart(),
            [item.pattern]: preparedItem
        });
    }

    public removeProduct(item: CartItem): void {
        const cart: Record<number, CartItem> = { ...this.localCart() };

        delete cart[item.pattern];

        this.localCart.set(cart);
    }

    public clearCart(): void {
        this.localCart.set({});
    }
}
