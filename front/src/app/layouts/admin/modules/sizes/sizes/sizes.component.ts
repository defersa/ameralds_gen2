import { IPaginatedResponse } from '@am/interface/request.interface';
import { SizeType } from '@am/interface/size.interface';
import { SizesService } from '@am/services/sizes.service';
import { Component } from '@angular/core';
import { Observable } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { FilteredPage, FiltersSet } from "@am/shared/abstract/filtered-page";
import { Params, RouterLink } from "@angular/router";
import { DestroyService } from "@am/utils/destroy.service";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AsyncPipe, DatePipe } from "@angular/common";
import { AmstorePaginatorComponent } from "@am/cdk/paginator/paginator.component";
import { AmstoreButtonRoundComponent } from "@am/cdk/buttons/round/round.component";
import type { CategoriesPaginatedPageDto, CategoryDto, SizeDto, SizesPaginatedPageDto } from "@am/root/api";


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
        switchMap((result: FiltersSet) => this.sizes.getSizes(result.page as number ?? 1)),
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
