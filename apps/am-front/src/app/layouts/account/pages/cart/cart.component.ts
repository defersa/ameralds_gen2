import { Component, computed, inject, signal, Signal, WritableSignal } from "@angular/core";
import { AmstoreSnapshotPatternComponent } from "@am-front/shared/snapshot/pattern/pattern.component";
import { CartService, ICartPattern } from "@am-front/services/cart.service";
import { PatternsService } from "@am-front/services/patterns.service";
import { Observable } from "rxjs";
import { map, switchMap, take } from "rxjs/operators";
import { IdRecord } from "@am-front/interface/common.interface";
import type { PatternEntityDto } from "@am-front/root/api-v2";
import { PatternCartShortComponent } from "@am-front/shared/actions/pattern/pattern-cart-short/pattern-cart-short.component";
import { toSignal } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { Currency, LangService } from "@am-front/services/lang.service";
import { AmstoreInfoComponent } from "@am-front/cdk/info/info.component";


interface CartItem {
    pattern: PatternEntityDto;
    cart: ICartPattern;
    index: number;
    removed?: boolean;
}

@Component({
    selector: "amstore-cart",
    templateUrl: "./cart.component.html",
    styleUrls: ["./cart.component.scss"],
    standalone: true,
    imports: [
        AmstoreSnapshotPatternComponent,
        PatternCartShortComponent,
        AmstoreButtonComponent,
        AmstoreInfoComponent
    ]
})
export class CartComponent {
    private readonly cartService: CartService = inject(CartService);
    private readonly langService: LangService = inject(LangService);
    private readonly patternService: PatternsService = inject(PatternsService);
    private readonly router: Router = inject(Router);

    public readonly price: Signal<number> = this.cartService.cartPrice;
    public readonly count: Signal<number> = this.cartService.cartCount;
    public readonly currency: Signal<Currency> = this.langService.currency;

    public removedList: WritableSignal<CartItem[]> = signal([]);
    public patterns: Signal<IdRecord<[number, PatternEntityDto]>> = toSignal(this.getInitPatterns());
    public items: Signal<CartItem[]> = computed(() => {
        const patterns: IdRecord<[number, PatternEntityDto]> = this.patterns();
        const fullCart: IdRecord<ICartPattern> = this.cartService.cart();
        const removed: CartItem[] = this.removedList();

        if (!patterns || Object.keys(patterns).length === 0) {
            return [];
        }

        const actualCart: CartItem[] = Object.entries(fullCart)
            .map(([key, cart]: [string, ICartPattern]) =>  ({
                cart,
                pattern: patterns[key][1],
                index: patterns[key][0],
            }));

        const removedCart: CartItem[] = removed.map((item: CartItem) => ({ ...item, removed: true }));

        return [...actualCart, ...removedCart];
    });

    public removeFromCart({ cart, pattern, index }: CartItem): void {
        this.removedList.set(
            [...this.removedList(), { cart, pattern, index }],
        );

        this.cartService.removePattern(pattern.id);
    }

    public returnToCart({ cart, pattern }: CartItem): void {
        this.removedList.set(
            this.removedList().filter((item: CartItem) => item.pattern.id !== pattern.id),
        );

        this.cartService.addPattern(cart, pattern);
    }

    public goToCart(id: number): void {
        this.router.navigate(["/", 'account', 'cart', 'pattern', id]);
    }

    private getInitPatterns(): Observable<IdRecord<[number, PatternEntityDto]>> {
        return this.cartService.patternsCart$
            .pipe(
                take(1),
                switchMap((cart: IdRecord<ICartPattern>) => this.patternService.getPatternsByIds(Object.keys(cart))),
                map((items: IdRecord<PatternEntityDto>) =>
                    Object.fromEntries(
                        Object.entries(items)
                            .map(([key, pattern]: [string, PatternEntityDto], index: number) => [key, [index, pattern]]),
                    ),
                )
            );
    }
}
