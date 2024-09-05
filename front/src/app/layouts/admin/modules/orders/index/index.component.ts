import { Component, inject } from '@angular/core';
import { AdminOrderService } from "@am/services/admin-order.service";
import { FilteredPage, FiltersSet } from "@am/shared/abstract/filtered-page";
import { Observable } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { Params } from "@angular/router";
import { IPaginatedResponse } from "@am/interface/request.interface";
import { IAdminOrderShort } from "@am/interface/order.interface";
import { DestroyService } from "@am/utils/destroy.service";


@Component({
    selector: 'admin-orders-index',
    templateUrl: './index.component.html',
    styleUrls: ['./index.component.scss'],
    providers: [DestroyService],
})
export class IndexComponent extends FilteredPage {
    public items$: Observable<IAdminOrderShort[]> = this.filterSet$.pipe(
        filter((result: FiltersSet) => !!result),
        map((result: FiltersSet) => {
            this.page = Number(result['page']) || 1;

            const startDate: string = result.startDate ? (result.startDate as Date).toISOString() : null;
            const endDate: string = result.endDate ? (result.endDate as Date).toISOString() : null;

            return {
                ...result,
                startDate,
                endDate,
                page: this.page,
            };
        }),
        switchMap((variables: Params) => this.adminOrder.getOrders(variables)),
        map((result: IPaginatedResponse<IAdminOrderShort>) => {
                this.pageCount = result.pageCount;
                return result.items;
            }
        ));


    public pageCount: number = 1;
    public page: number;
    public filters: Record<string, unknown> = {};

    protected adminOrder: AdminOrderService = inject(AdminOrderService);

    public setFilterWithPage(filters: Record<string, unknown>): void {
        this.setFilter({
            ...filters,
            page: 1,
        });
    }

    protected initFilters(query: Params): FiltersSet {
        console.log(query['startDate'])
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
