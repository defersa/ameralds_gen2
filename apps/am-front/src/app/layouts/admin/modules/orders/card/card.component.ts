import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { AsyncPipe, DatePipe, Location } from "@angular/common";
import { AdminOrderService } from "@am-front/services/cart/admin-order.service";
import { Observable } from "rxjs";
import { IAdminOrder, IPurchaseSaved } from "@am-front/interface/order.interface";
import { map } from "rxjs/operators";
import { PattenSizeFiles } from "@am-front/interface/pattern.interface";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { AmstoreInfoComponent } from "@am-front/cdk/info/info.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";


type IAdminOrderWithStatus = IAdminOrder & {
    purchases: (IPurchaseSaved & {
        sizesWithStatus: {
            value: number;
            status: boolean;
        }[];
    })[];
}

@Component({
    selector: "app-card",
    templateUrl: "./card.component.html",
    styleUrls: ["./card.component.scss"],
    imports: [
        AmstoreButtonComponent,
        AsyncPipe,
        AmstoreInfoComponent,
        IconsComponent,
        DatePipe,
    ]
})
export class CardComponent implements OnInit {
    public readonly location: Location = inject(Location);
    public readonly adminOrder: AdminOrderService = inject(AdminOrderService);
    public readonly route: ActivatedRoute = inject(ActivatedRoute);

    public id: number;

    public order$: Observable<IAdminOrderWithStatus>;

    public ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id')) ?? null;
    }

    public getBack(): void {
        this.location.back();
    }
}
