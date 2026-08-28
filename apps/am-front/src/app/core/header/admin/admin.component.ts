import { Component, inject } from "@angular/core";
import { UserCartService } from "@am-front/services/cart/sources/user-cart.service";
import { AmstoreButtonRoundComponent } from "@am-front/cdk/buttons/round/round.component";
import { RouterLink } from "@angular/router";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";


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
    private goodsService: UserCartService = inject(UserCartService);
}
