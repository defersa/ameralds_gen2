import { Component } from '@angular/core';
import { CategoriesService } from '@am/services/categories.service';
import { CategoryType } from '@am/interface/category.interface';
import { FilteredPage, FiltersSet } from "@am/shared/abstract/filtered-page";
import { Observable } from "rxjs";
import { IPattern } from "@am/interface/pattern.interface";
import { filter, map, switchMap } from "rxjs/operators";
import { Params } from "@angular/router";
import { DestroyService } from "@am/utils/destroy.service";
import { IPaginatedResponse } from "@am/interface/request.interface";


@Component({
    selector: 'admin-categories',
    templateUrl: './categories.component.html',
    styleUrls: ['./categories.component.scss'],
    providers: [DestroyService],
})
export class CategoriesComponent extends FilteredPage {
    public items$: Observable<CategoryType[]> = this.filterSet$.pipe(
        filter((result: FiltersSet) => !!result),
        map((result: FiltersSet) => {
            this.page = Number(result['page']) || 1;

            return this.page;
        }),
        switchMap((page: number) => this.categories.getCategories(page)),
        map((result: IPaginatedResponse<IPattern>) => {
                this.pageCount = result.pageCount;
                return result.items;
            }
        ));


    public pageCount: number = 1;
    public page: number;
    public filters: Record<string, unknown>;

    constructor(
        private categories: CategoriesService
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
