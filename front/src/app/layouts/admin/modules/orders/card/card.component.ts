import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { Location } from "@angular/common";
import { AdminOrderService } from "@am/services/admin-order.service";
import { Observable } from "rxjs";
import { IAdminOrder, IPurchaseSaved } from "@am/interface/order.interface";
import { map } from "rxjs/operators";
import { PattenSizeFiles } from "@am/interface/pattern.interface";

type IAdminOrderWithStatus = IAdminOrder & {
    purchases: (IPurchaseSaved & {
        sizesWithStatus: {
            value: number;
            status: boolean;
        }[];
    })[];
}

@Component({
    selector: 'app-card',
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
    public readonly location: Location = inject(Location);
    public adminOrder: AdminOrderService = inject(AdminOrderService);
    public route: ActivatedRoute = inject(ActivatedRoute);

    public id: number;

    public order$: Observable<IAdminOrderWithStatus>;


    public ngOnInit(): void {
        this.id = Number(this.route.snapshot.paramMap.get('id')) ?? null;

        if (this.id && typeof this.id === 'number') {
            this.order$ = this.adminOrder
                .getOrder({ id: this.id })
                .pipe(
                    map((order: IAdminOrder) => {
                        return {
                            ...order,
                            purchases: order.purchases.map((purchase: IPurchaseSaved) => ({
                                ...purchase,
                                sizesWithStatus: purchase.pattern.sizes.map((size: PattenSizeFiles) => ({
                                    value: size.size.value,
                                    status: !!purchase.sizes.find((patternSize: PattenSizeFiles) => size.id === patternSize.id)
                                }))
                            }))
                        }
                    }),
                );
        }
    }

    public getBack(): void {
        this.location.back();
    }
}
