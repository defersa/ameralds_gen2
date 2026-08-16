import { computed, DestroyRef, inject, Injectable, Signal } from "@angular/core";
import { LocalStorage } from "@am-front/decorators/local.decorator";
import { PatternsService } from "@am-front/services/patterns.service";
import { parseJsonWithDefault } from "@am-front/utils/common.utils";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import {
    InputShortOrderPatternDto,
    NumberEntityDto,
    ApiOrdersProducer,
    PatternEntityDto, type PatternWithPriceDto,
    ShortOrderPatternDto,
    type UserOrderDto,
    UserProfileDto
} from "@am-front/root/api-v2";
import { ProfileService } from "@am-front/services/profile.service";
import { debounceTime, filter, map, shareReplay, skip, switchMap, takeUntil } from "rxjs/operators";
import { IdRecord } from "@am-front/interface/common.interface";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { LangService, LangType } from "@am-front/services/lang.service";


const LOCAL_PATTERN_CART_NAME: string = "localPatternCartName";

export interface ICartPattern {
    id: number;
    sizes: number[];
    pattern: boolean;
    color: boolean;
    price?: NumberEntityDto;
}

@Injectable({
    providedIn: "root"
})
export class CartService {
    @LocalStorage(LOCAL_PATTERN_CART_NAME)
    private localPatternCart!: string;

    private readonly patternsService: PatternsService = inject(PatternsService);
    private readonly profileService: ProfileService = inject(ProfileService);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
    private readonly langService: LangService = inject(LangService);
    private readonly ordersProducer: ApiOrdersProducer = inject(ApiOrdersProducer);

    public readonly ownPatterns$: Observable<IdRecord<ShortOrderPatternDto>> = this.initOwnPatternObs();
    private readonly _patternsCart$: BehaviorSubject<IdRecord<ICartPattern>> = new BehaviorSubject<IdRecord<ICartPattern>>({});
    private readonly _cartInit$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    public readonly cart: Signal<IdRecord<ICartPattern>> = toSignal(this._patternsCart$);
    public readonly cartCount: Signal<number> = computed(() => {
        const cart: IdRecord<ICartPattern> = this.cart();

        return Object.values(cart).length;
    });

    public readonly cartPrice: Signal<number> = computed(() => {
        const cart: IdRecord<ICartPattern> = this.cart();
        const lang: LangType = this.langService.lang();

        return Object.values(cart)
            .map((pattern: ICartPattern) => pattern.price[lang])
            .reduce((a: number, b: number) => a + b, 0);
    });

    public get patternsCart$(): Observable<IdRecord<ICartPattern>> {
        return this._patternsCart$.asObservable();
    }

    constructor() {
        this.initPatternsCart();
        this.initLocalCart();
        this.initUserCartCalculator();
        this.initOrderProfileUpdateListener();
    }

    private initOrderProfileUpdateListener(): void {
        this._cartInit$
            .pipe(
                filter(Boolean),
                switchMap(() => this._patternsCart$),
                switchMap(() => this.profileService.user$),
                debounceTime(100),
                filter(Boolean),
                switchMap(() => {
                    const orders: InputShortOrderPatternDto[] = Object.entries(this._patternsCart$.getValue())
                        .map(([key, order]: [string, ICartPattern]) => ({
                            ...order,
                            requiresPatternPurchase: order.pattern,
                            sizes: order.sizes,
                            pattern: Number(key),
                        }));

                    return this.ordersProducer.ordersControllerUpdate(orders);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    public addPattern(pattern: ICartPattern, origin: PatternWithPriceDto): void {
        this._patternsCart$.next({
            ...this._patternsCart$.getValue(),
            [pattern.id]: { ...pattern, price: this.getPrice(pattern, origin) }
        });
    }

    public removePattern(id: number): void {
        const card: IdRecord<ICartPattern> = { ...this._patternsCart$.getValue() };

        delete card[id];

        this._patternsCart$.next(card);
    }

    private initUserCartCalculator(): void {
        this.profileService.userCart$
            .pipe(
                filter(Boolean),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((userCart: UserOrderDto) => {
                // TODO: TUTA
                const cart: IdRecord<ICartPattern> = {...this._patternsCart$.getValue()};
                const boughtPatterns: ShortOrderPatternDto[] = [...this.profileService.boughtPatterns$.getValue()];

                userCart.patterns.forEach((userPatternOrder: ShortOrderPatternDto) => {
                    const previousItem: ICartPattern = cart[userPatternOrder.pattern.id];
                    const item: ICartPattern = {
                        id: userPatternOrder.pattern.id,
                        pattern: userPatternOrder.requiresPatternPurchase || previousItem?.pattern,
                        color: userPatternOrder.color || previousItem?.color,
                        sizes: [...userPatternOrder.sizes, ...(previousItem?.sizes || [])],
                    };

                    cart[item.id] = {
                        ...item,
                        price: this.getPrice(item, userPatternOrder.pattern),
                    };
                });

                Object.keys(cart)
                    .map(Number)
                    .map((id: number) => boughtPatterns
                        .find(((item: ShortOrderPatternDto) => item.id === id)))
                    .filter(Boolean)
                    .forEach((bought: ShortOrderPatternDto) => {
                        const item: ICartPattern = cart[bought.id];
                        const newItem: ICartPattern ={
                            ...item,
                            color: !bought.color && item.color,
                            pattern: false,
                            sizes: item.sizes.filter((size: number) => !bought.sizes.includes(size)),
                        };

                        cart[bought.id] = {
                            ...newItem,
                            price: this.getPrice(newItem, bought.pattern),
                        };
                    });

                this._patternsCart$.next(cart);
            });
    }

    private initPatternsCart(): void {
        const localCart: ICartPattern[] = parseJsonWithDefault(this.localPatternCart, []) ?? [];

        if (!localCart.length) {
            return;
        }

        const ids: number[] = localCart.map((pattern: ICartPattern) => pattern.id);

        this.patternsService.getPatternsByIds(ids)
            .subscribe((patterns: Record<string, PatternEntityDto>) => {
                const cart: IdRecord<ICartPattern> = Object.fromEntries(
                    localCart.map((pattern: ICartPattern) => [
                        pattern.id,
                        {
                            ...pattern,
                            price: this.getPrice(pattern, patterns[pattern.id])
                        }
                    ])
                );

                this._patternsCart$.next(cart);
                this._cartInit$.next(true);
            });
    }

    private initLocalCart(): void {
        this._patternsCart$
            .pipe(
                skip(1),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((cart: IdRecord<ICartPattern>) => {
                this.localPatternCart = JSON.stringify(
                    Object.values(cart)
                        .map(({ id, sizes, pattern, color }: ICartPattern) => ({
                            id,
                            sizes,
                            pattern,
                            color
                        }))
                );
            });
    }

    public getPatternWithStatus(pattern: PatternEntityDto): Observable<unknown> {
        return combineLatest([
            this.ownPatterns$,
            this.patternsCart$
        ]).pipe(
            map(([ownPatterns, patternsCart]: [IdRecord<ShortOrderPatternDto>, IdRecord<ICartPattern>]) => ({
                own: ownPatterns[pattern.id],
                cart: patternsCart[pattern.id]
            }))
        );
    }

    public getPrice(pattern: ICartPattern, origin: PatternWithPriceDto): NumberEntityDto {
        const priceByLang: (lang: "ru" | "en", pattern: ICartPattern, origin: PatternWithPriceDto) => number =
            (lang: "ru" | "en", pattern: ICartPattern, origin: PatternWithPriceDto) =>
                origin.basePrice[lang] * Number(pattern.pattern)
                + origin.additionalPrice[lang] * (pattern.sizes.length > 0 ? (pattern.sizes.length - 1) : 0)
                + origin.colorPrice[lang] * Number(pattern.color);

        return {
            ru: priceByLang("ru", pattern, origin) || 0,
            en: priceByLang("en", pattern, origin) || 0
        };
    }

    private initOwnPatternObs(): Observable<IdRecord<ShortOrderPatternDto>> {
        return this.profileService.user$
            .pipe(
                map((user: UserProfileDto) => user?.ownPatterns ? Object.fromEntries(
                    user.ownPatterns.map((pattern: ShortOrderPatternDto) => [pattern.id, pattern])) : {}),
                shareReplay()
            );
    }
}
