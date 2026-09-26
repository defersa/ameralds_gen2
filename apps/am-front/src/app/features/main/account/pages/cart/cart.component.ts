import { Component, computed, DestroyRef, effect, inject, signal, Signal, WritableSignal } from '@angular/core';
import { PatternsService } from "@am-front/services/patterns.service";
import { IdRecord } from "@am-front/interface/common.interface";
import { NumberEntityDto, PatternEntityDto } from '@am-front/root/api-v2';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from "@angular/router";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { Currency, LangService } from "@am-front/services/lang.service";
import { AmstoreInfoComponent } from "@am-front/cdk/info/info.component";
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { CartItemModel } from '@am-front/services/cart/order.misc';
import { AmstoreSnapshotPatternComponent } from '@am-front/shared/snapshot/pattern/pattern.component';


interface CartItem {
    pattern: PatternEntityDto;
    cart: CartItemModel;
}

@Component({
    selector: "amstore-cart",
    templateUrl: "./cart.component.html",
    styleUrls: ["./cart.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        AmstoreInfoComponent,
        AmstoreSnapshotPatternComponent
    ]
})
export class CartComponent {
    private readonly cartService: MajorCartService = inject(MajorCartService);
    private readonly langService: LangService = inject(LangService);
    private readonly patternService: PatternsService = inject(PatternsService);
    private readonly router: Router = inject(Router);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    public readonly price: Signal<null | NumberEntityDto> = this.cartService.price;
    public readonly currency: Signal<Currency> = this.langService.currency;
    public readonly count: Signal<number> = computed(() => this.cartService.cart()?.length || 0);

    public removed: WritableSignal<CartItem[]> = signal([]);
    public items: Signal<CartItem[]> = computed(() => {
        const patterns: IdRecord<PatternEntityDto> = this.initPatterns();
        const cart: CartItemModel[] = this.cartService.cart();

        if (!patterns) {
            return null;
        }

        return cart
            .map((cart: CartItemModel) =>  ({
                cart,
                pattern: patterns[cart.pattern],
            }));
    });

    private initPatterns: WritableSignal<IdRecord<PatternEntityDto>> = signal(null);

    constructor() {
        effect(() => {
            const cart: CartItemModel[] = this.cartService.cart();

            if (!cart) {
                return;
            }

            this.getInitPatterns(cart);
        });
    }

    public removeFromCart({ cart, pattern }: CartItem): void {
        this.removed.set(
            [...this.removed(), { cart, pattern }],
        );

        this.cartService.removeProduct(pattern.id);
    }

    public returnToCart({ cart, pattern }: CartItem): void {
        this.removed.set(
            this.removed().filter((item: CartItem) => item.pattern.id !== pattern.id),
        );

        this.cartService.addProduct(cart);
    }

    public goToCart(id: number): void {
        this.router.navigate(["/", 'account', 'cart', 'pattern', id]);
    }

    private getInitPatterns(cart: CartItemModel[]): void {
        this.patternService.getPatternsByIds(cart.map((pattern: CartItemModel) => pattern.pattern))
            .pipe(
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((patterns: Record<string, PatternEntityDto>) => this.initPatterns.set(patterns));
    }
}
