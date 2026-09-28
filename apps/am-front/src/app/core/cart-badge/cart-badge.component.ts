import { Component, computed, inject, Signal } from '@angular/core';
import { UserCartService } from "@am-front/services/cart/sources/user-cart.service";
import { AmstoreButtonRoundComponent } from "@am-front/cdk/buttons/round/round.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { Currency, LangService } from "@am-front/services/lang.service";
import { DecimalPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { NumberEntityDto } from '@am-front/root/api-v2';


@Component({
    selector: "amstore-cart-badge",
    templateUrl: "./cart-badge.component.html",
    styleUrls: ["./cart-badge.component.scss"],
    imports: [
        AmstoreButtonRoundComponent,
        IconsComponent,
        DecimalPipe,
        RouterLink,
    ],
})
export class CartBadgeComponent {
    private cartService: MajorCartService = inject(MajorCartService);
    private langService: LangService = inject(LangService);

    public currency: Signal<Currency> = this.langService.currency;
    public cartCount: Signal<number> = computed(() => this.cartService.cart()?.length || 0);
    public cartPrice: Signal<NumberEntityDto> = this.cartService.price;
}
