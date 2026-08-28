import { Component, inject } from '@angular/core';
import { AdminCartService } from "@am-front/services/cart/sources/admin-cart.service";
import { FilteredPage, FiltersSet } from "@am-front/shared/abstract/filtered-page";
import { Observable } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { Params } from "@angular/router";
import { IPaginatedResponse } from "@am-front/interface/request.interface";
import { IAdminOrderShort } from "@am-front/interface/order.interface";
import { DestroyService } from "@am-front/utils/destroy.service";
import { OrdersFilterComponent } from "@am-front/shared/filters/orders/orders-filter.component";
import { AsyncPipe } from "@angular/common";
import { SnapshotAdminOrderComponent } from "@am-front/shared/snapshot/admin-order/snapshot-admin-order.component";
import { AmstorePaginatorComponent } from "@am-front/cdk/paginator/paginator.component";


@Component({
    selector: "admin-orders-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.scss"],
    providers: [DestroyService],
    imports: [
        OrdersFilterComponent,
        AsyncPipe,
        SnapshotAdminOrderComponent,
        AmstorePaginatorComponent
    ]
})
export class IndexComponent extends FilteredPage {

    public pageCount: number = 1;
    public page: number;
    public filters: Record<string, unknown> = {};

    protected adminOrder: AdminCartService = inject(AdminCartService);

    public setFilterWithPage(filters: Record<string, unknown>): void {
        this.setFilter({
            ...filters,
            page: 1,
        });
    }

    protected initFilters(query: Params): FiltersSet {
        const startDate: Date = query['startDate'] ? new Date(query['startDate']) : null;
        const endDate: Date = query['endDate'] ? new Date(query['endDate']) : null;

        this.filters = {
            email: query['email'] ?? '',
            startDate,
            endDate,
        };

        this.page = Number(query['page']) || 1;

        return {
            ...this.filters,
            page: query['page']
        };
    }

}
