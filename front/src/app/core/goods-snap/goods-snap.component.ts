import { Component, computed, inject, Signal } from "@angular/core";
import { NEVER, Subject } from "rxjs";
import { CartService, ICartPattern } from "@am/services/cart.service";
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import { AsyncPipe } from "@angular/common";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { Currency, LangService, LangType } from "@am/services/lang.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs/operators";


@Component({
    selector: "amstore-goods-snap",
    templateUrl: "./goods-snap.component.html",
    styleUrls: ["./goods-snap.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonRoundComponent,
        AsyncPipe,
        IconsComponent
    ]
})
export class GoodsSnapComponent {
    private cartService: CartService = inject(CartService);
    private langService: LangService = inject(LangService);

    public patternsCart: Signal<ICartPattern[]> = toSignal(this.cartService.patternsCart$);
    public lang: Signal<LangType> = toSignal(this.langService.lang$);
    public currency: Signal<Currency> = this.langService.currency;
    public cartCount: Signal<number> = computed(() => this.patternsCart().length);
    public cartPrice: Signal<number> = computed(() => {
       const patternCart: ICartPattern[] = this.patternsCart();
       const lang: LangType = this.lang();

       return patternCart
           .map((pattern: ICartPattern) => pattern.price[lang])
           .reduce((a: number, b: number) => a + b, 0);
    });
}
