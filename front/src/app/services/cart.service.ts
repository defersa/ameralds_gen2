import { inject, Injectable } from "@angular/core";
import { LocalStorage } from "@am/decorators/local.decorator";
import { PatternsService } from "@am/services/patterns.service";
import { parseJsonWithDefault } from "@am/utils/common.utils";
import { BehaviorSubject, Observable } from "rxjs";
import { NumberEntityDto, PatternEntityDto } from "@am/root/api";


const LOCAL_PATTERN_CART_NAME: string = "localPatternCartName";

export interface ICartPattern {
    id: number;
    size: number[];
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

    private patternsService: PatternsService = inject(PatternsService);

    private _patternsCart$: BehaviorSubject<ICartPattern[]> = new BehaviorSubject<ICartPattern[]>([]);

    public get patternsCart$(): Observable<ICartPattern[]> {
        return this._patternsCart$.asObservable();
    }

    constructor() {
        this.initPatternsCart();
    }

    public addPattern(pattern: ICartPattern, origin: PatternEntityDto): void {
        const cart: ICartPattern[] = this._patternsCart$.getValue()
            .filter((item: ICartPattern) => item.id !== pattern.id);

        this._patternsCart$.next([
            ...cart,
            { ...pattern, price: this.getPrice(pattern, origin) },
        ]);
    }

    public removePattern(id: number): void {
        this._patternsCart$.next(this._patternsCart$.getValue()
            .filter((pattern: ICartPattern) => pattern.id !== id));
    }

    private initPatternsCart(): void {
        const cart: ICartPattern[] = parseJsonWithDefault(this.localPatternCart, []);

        if (!cart.length) {
            return;
        }

        const ids: number[] = cart.map((pattern: ICartPattern) => pattern.id);

        this.patternsService.getPatternsByIds(ids)
            .subscribe((patterns: Record<string, PatternEntityDto>) => {
                this._patternsCart$.next(
                    cart.map((pattern: ICartPattern) => ({
                        ...pattern,
                        price: this.getPrice(pattern, patterns[pattern.id]),
                    }))
                );
            });
    }

    public getPrice(pattern: ICartPattern, origin: PatternEntityDto): NumberEntityDto {
        const priceByLang: (lang: "ru" | "en", pattern: ICartPattern, origin: PatternEntityDto) => number =
            (lang: "ru" | "en", pattern: ICartPattern, origin: PatternEntityDto) =>
                origin.basePrice[lang] * Number(pattern.pattern)
                + origin.additionalPrice[lang] * (pattern.size.length - 1)
                + origin.colorPrice[lang] * Number(pattern.color);

        return {
            ru: priceByLang('ru', pattern, origin),
            en: priceByLang('en', pattern, origin),
        };
    }
}
