import { Directive, inject } from "@angular/core";
import { DestroyService } from "@am/utils/destroy.service";
import { FilteredPage, FiltersSet } from "@am/shared/abstract/filtered-page";
import { Observable } from "rxjs";
import { IPattern } from "@am/interface/pattern.interface";
import { filter, map, switchMap } from "rxjs/operators";
import { Params } from "@angular/router";
import { PatternService } from "@am/services/pattern.service";
import { IPaginatedResponse } from "@am/interface/request.interface";


@Directive({
    providers: [DestroyService],
})
export abstract class AbstractPatternsIndex extends FilteredPage {
    public items$: Observable<IPattern[]> = this.filterSet$.pipe(
        filter((result: FiltersSet) => !!result),
        map((result: FiltersSet) => {
            this.page = Number(result['page']) || 1;

            return {
                ...result,
                page: this.page,
            };
        }),
        switchMap((variables: Params) => this.pattern.getPatterns(variables)),
        map((result: IPaginatedResponse<IPattern>) => {
                this.pageCount = result.pageCount;
                return result.items;
            }
        ));


    public pageCount: number = 1;
    public page: number;
    public filters: Record<string, unknown>;

    protected pattern: PatternService = inject(PatternService);

    constructor(
    ) {
        super();
    }

    public setFilterWithPage(filters: Record<string, unknown>): void {
        this.setFilter({
            ...filters,
            page: 1,
        });
    }

    protected initFilters(query: Params): FiltersSet {
        const categories: number[] =
            (typeof query['categories'] === 'string' ? [query['categories']] : query['categories'] as [])
            ?.map(Number) || [];

        const sizes: number[] =
            (typeof query['sizes'] === 'string' ? [query['sizes']] : query['sizes'] as [])
            ?.map(Number) || [];

        this.filters = {
            search: query['search'] ?? '',
            categories,
            sizes
        };

        this.page = Number(query['page']) || 1;

        return {
            ...this.filters,
            page: query['page']
        };
    }
}
