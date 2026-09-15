import { Component, inject } from '@angular/core';
import { AdminCartService } from "@am-front/services/cart/sources/admin-cart.service";
import { FilteredPage, FiltersSet } from "@am-front/shared/abstract/filtered-page";
import { Params } from "@angular/router";
import { DestroyService } from "@am-front/utils/destroy.service";
import { OrdersFilterComponent } from "@am-front/shared/filters/orders/orders-filter.component";
import { AmstorePaginatorComponent } from "@am-front/cdk/paginator/paginator.component";


@Component({
    selector: "admin-orders-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.scss"],
    providers: [DestroyService],
    imports: [
        OrdersFilterComponent,
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
