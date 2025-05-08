import { Component, computed, inject, Signal } from "@angular/core";
import { CartService, ICartPattern } from "@am/services/cart.service";
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { Currency, LangService, LangType } from "@am/services/lang.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { IdRecord } from "@am/interface/common.interface";
import { DecimalPipe } from "@angular/common";
import { RouterLink } from "@angular/router";


@Component({
    selector: "amstore-cart-snap",
    templateUrl: "./cart-snap.component.html",
    styleUrls: ["./cart-snap.component.scss"],
    imports: [
        AmstoreButtonRoundComponent,
        IconsComponent,
        DecimalPipe,
        RouterLink,
    ],
})
export class CartSnapComponent {
    private cartService: CartService = inject(CartService);
    private langService: LangService = inject(LangService);

    public patternsCart: Signal<IdRecord<ICartPattern>> = toSignal(this.cartService.patternsCart$);
    public lang: Signal<LangType> = toSignal(this.langService.lang$);
    public currency: Signal<Currency> = this.langService.currency;
    public cartCount: Signal<number> = computed(() => {
        const cart: IdRecord<ICartPattern> = this.patternsCart();

        return Object.values(cart).length;
    });

    public cartPrice: Signal<number> = computed(() => {
        const cart: IdRecord<ICartPattern> = this.patternsCart();
        const lang: LangType = this.lang();

        return Object.values(cart)
            .map((pattern: ICartPattern) => pattern.price[lang])
            .reduce((a: number, b: number) => a + b, 0);
    });
}
