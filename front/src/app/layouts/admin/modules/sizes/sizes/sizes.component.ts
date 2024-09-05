import { IPaginatedResponse } from '@am/interface/request.interface';
import { SizeType } from '@am/interface/size.interface';
import { SizesService } from '@am/services/sizes.service';
import { Component } from '@angular/core';
import { Observable } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { FilteredPage, FiltersSet } from "@am/shared/abstract/filtered-page";
import { Params } from "@angular/router";
import { DestroyService } from "@am/utils/destroy.service";


@Component({
    selector: 'app-sizes',
    templateUrl: './sizes.component.html',
    styleUrls: ['./sizes.component.scss'],
    providers: [DestroyService],
})
export class SizesComponent extends FilteredPage {
    public items$: Observable<SizeType[]> = this.filterSet$.pipe(
        filter((result: FiltersSet) => !!result),
        map((result: FiltersSet) => {
            this.page = Number(result['page']) || 1;

            return this.page;
        }),
        switchMap((page: number) => this.sizes.getSizes(page)),
        map((result: IPaginatedResponse<SizeType>) => {
                this.pageCount = result.pageCount;
                return result.items;
            }
        ));


    public pageCount: number = 1;
    public page: number;
    public filters: Record<string, unknown>;

    constructor(
        private sizes: SizesService
    ) {
        super();
    }

    protected initFilters(query: Params): FiltersSet {
        this.page = Number(query['page']) || 1;

        return {
            page: query['page']
        };
    }
}
