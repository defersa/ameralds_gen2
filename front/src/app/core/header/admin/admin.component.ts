import { Component, inject } from "@angular/core";
import { Subject } from "rxjs";
import { CartService } from "@am/services/cart.service";
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import { AsyncPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "amstore-header-admin",
    templateUrl: "./admin.component.html",
    styleUrls: ["./admin.component.scss"],
    standalone: true,
    imports: [
        AmstoreButtonRoundComponent,
        AsyncPipe,
        RouterLink,
        IconsComponent
    ]
})
export class AmstoreHeaderAdminComponent {
    private goodsService: CartService = inject(CartService);
}
