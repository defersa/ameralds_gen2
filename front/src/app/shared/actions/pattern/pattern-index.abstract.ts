import { Directive, inject } from "@angular/core";
import { FilteredPage, FiltersSet } from "@am/shared/abstract/filtered-page";
import { Observable } from "rxjs";
import { IPattern } from "@am/interface/pattern.interface";
import { filter, map, switchMap } from "rxjs/operators";
import { Params } from "@angular/router";
import { PatternService } from "@am/services/pattern.service";
import { IPaginatedResponse } from "@am/interface/request.interface";
import { PatternsService } from "@am/services/patterns.service";
import type { PatternEntityDto, PatternsPaginatedPageDto, SizeDto, SizesPaginatedPageDto } from "@am/root/api";


@Directive()
export abstract class AbstractPatternsIndex extends FilteredPage {
    public items$: Observable<PatternEntityDto[]> = this.filterSet$.pipe(
        filter(Boolean),
        switchMap((variables: Params) => this.patternsService.getPatterns(variables.page as number ?? 1)),
        map((result: PatternsPaginatedPageDto) => {
                this.pageCount = result.count;
                return result.items;
            }
        ));


    public pageCount: number = 1;
    public page: number = 1;
    public filters: Record<string, unknown>;

    protected patternsService: PatternsService = inject(PatternsService);

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
