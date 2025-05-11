import { Component, computed, inject, signal, Signal, WritableSignal } from "@angular/core";
import { AmstoreSnapshotPatternComponent } from "@am/shared/snapshot/pattern/pattern.component";
import { AsyncPipe } from "@angular/common";
import { ShortPatternDetailsComponent } from "@am/shared/details/pattern/short/short.component";
import { CartService, ICartPattern } from "@am/services/cart.service";
import { PatternsService } from "@am/services/patterns.service";
import { Observable } from "rxjs";
import { map, switchMap, take, tap } from "rxjs/operators";
import { IdRecord } from "@am/interface/common.interface";
import type { PatternEntityDto } from "@am/root/api";
import { combineSwitchMap } from "@am/utils/combine-switch-map";
import { PatternCartShortComponent } from "@am/shared/actions/pattern/pattern-cart-short/pattern-cart-short.component";
import { toSignal } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";


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
    ],
})
export class CartComponent {
    private readonly cartService: CartService = inject(CartService);
    private readonly patternService: PatternsService = inject(PatternsService);
    private readonly router: Router = inject(Router);

    public removedList: WritableSignal<{ pattern: PatternEntityDto; cart: ICartPattern; index: number }[]> = signal([]);
    public patterns: Signal<IdRecord<[number, PatternEntityDto]>> = toSignal(this.getInitPatterns());
    public items: Signal<CartItem[]> = computed(() => {
        const patterns: IdRecord<[number, PatternEntityDto]> = this.patterns();
        const fullCart: IdRecord<ICartPattern> = this.cartService.patternCart();
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
            this.removedList().filter((item: { pattern: PatternEntityDto }) => item.pattern.id !== pattern.id),
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
