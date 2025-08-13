import { IPaginatedResponse } from "@am-front/interface/request.interface";
import { SizeType } from "@am-front/interface/size.interface";
import { SizesService } from "@am-front/services/sizes.service";
import { Component } from '@angular/core';
import { Observable } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { FilteredPage, FiltersSet } from "@am-front/shared/abstract/filtered-page";
import { Params, RouterLink } from "@angular/router";
import { DestroyService } from "@am-front/utils/destroy.service";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AsyncPipe, DatePipe } from "@angular/common";
import { AmstorePaginatorComponent } from "@am-front/cdk/paginator/paginator.component";
import { AmstoreButtonRoundComponent } from "@am-front/cdk/buttons/round/round.component";
import type { CategoriesPaginatedPageDto, CategoryDto, SizeDto, SizesPaginatedPageDto } from "@am-front/root/api";


@Component({
    selector: "app-sizes",
    templateUrl: "./sizes.component.html",
    styleUrls: ["./sizes.component.scss"],
    providers: [DestroyService],
    imports: [
        RouterLink,
        IconsComponent,
        AsyncPipe,
        AmstorePaginatorComponent,
        DatePipe,
        AmstoreButtonRoundComponent
    ]
})
export class SizesComponent extends FilteredPage {
    public items$: Observable<SizeDto[]> = this.filterSet$.pipe(
        filter(Boolean),
        switchMap((result: FiltersSet) => this.sizes.getSizes(result['page'] as number ?? 1)),
        map((result: SizesPaginatedPageDto) => {
                this.pageCount = result.count;
                this.page = result.page;

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
