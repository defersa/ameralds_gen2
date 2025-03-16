import { inject, Injectable } from "@angular/core";
import { LocalStorage } from "@am/decorators/local.decorator";
import { PatternsService } from "@am/services/patterns.service";
import { parseJsonWithDefault } from "@am/utils/common.utils";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { NumberEntityDto, PatternEntityDto, ShortOrderPatternDto, UserProfileDto } from "@am/root/api";
import { ProfileService } from "@am/services/profile.service";
import { map, shareReplay } from "rxjs/operators";
import { IdRecord } from "@am/interface/common.interface";


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

    public readonly ownPatterns$: Observable<IdRecord<ShortOrderPatternDto>> = this.initOwnPatternObs();
    private readonly _patternsCart$: BehaviorSubject<IdRecord<ICartPattern>> = new BehaviorSubject<IdRecord<ICartPattern>>({});

    public get patternsCart$(): Observable<IdRecord<ICartPattern>> {
        return this._patternsCart$.asObservable();
    }

    constructor() {
        this.initPatternsCart();
    }

    public addPattern(pattern: ICartPattern, origin: PatternEntityDto): void {
        this._patternsCart$.next({
            ...this._patternsCart$.getValue(),
            [pattern.id]: { ...pattern, price: this.getPrice(pattern, origin) }
        });
    }

    public removePattern(id: number): void {
        const card: IdRecord<ICartPattern> = this._patternsCart$.getValue();

        delete card[id];

        this._patternsCart$.next(card);
    }

    private initPatternsCart(): void {
        const localCart: ICartPattern[] = parseJsonWithDefault(this.localPatternCart, []);

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
                            price: this.getPrice(pattern, patterns[pattern.id]),
                        },
                    ]),
                );

                this._patternsCart$.next(cart);
            });
    }

    public getPatternWithStatus(pattern: PatternEntityDto): Observable<unknown> {
        return combineLatest([
            this.ownPatterns$,
            this.patternsCart$
        ]).pipe(
            map(([ownPatterns, patternsCart]: [IdRecord<ShortOrderPatternDto>, IdRecord<ICartPattern>]) => ({
                own: ownPatterns[pattern.id],
                cart: patternsCart[pattern.id],
            })),
        );
    }

    public getPrice(pattern: ICartPattern, origin: PatternEntityDto): NumberEntityDto {
        const priceByLang: (lang: "ru" | "en", pattern: ICartPattern, origin: PatternEntityDto) => number =
            (lang: "ru" | "en", pattern: ICartPattern, origin: PatternEntityDto) =>
                origin.basePrice[lang] * Number(pattern.pattern)
                + origin.additionalPrice[lang] * (pattern.sizes.length - 1)
                + origin.colorPrice[lang] * Number(pattern.color);

        return {
            ru: priceByLang("ru", pattern, origin),
            en: priceByLang("en", pattern, origin)
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
