import { Component, inject } from "@angular/core";
import { CartService } from "@am/services/cart.service";
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import { RouterLink } from "@angular/router";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "amstore-header-admin",
    templateUrl: "./admin.component.html",
    styleUrls: ["./admin.component.scss"],
    imports: [
        AmstoreButtonRoundComponent,
        RouterLink,
        IconsComponent
    ]
})
export class AmstoreHeaderAdminComponent {
    private goodsService: CartService = inject(CartService);
}
