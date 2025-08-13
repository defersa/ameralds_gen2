import { Component, inject, Signal } from "@angular/core";
import { CartService } from "@am-front/services/cart.service";
import { AmstoreButtonRoundComponent } from "@am-front/cdk/buttons/round/round.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { Currency, LangService } from "@am-front/services/lang.service";
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

    public currency: Signal<Currency> = this.langService.currency;
    public cartCount: Signal<number> = this.cartService.cartCount;
    public cartPrice: Signal<number> = this.cartService.cartPrice;
}
