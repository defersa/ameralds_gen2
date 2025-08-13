import { Component, inject } from "@angular/core";
import { CategoriesService } from "@am-front/services/categories.service";
import { FilteredPage, FiltersSet } from "@am-front/shared/abstract/filtered-page";
import { Observable } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { Params, RouterLink } from "@angular/router";
import { DestroyService } from "@am-front/utils/destroy.service";
import { AmstoreButtonRoundComponent } from "@am-front/cdk/buttons/round/round.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AsyncPipe, DatePipe } from "@angular/common";
import { AmstorePaginatorComponent } from "@am-front/cdk/paginator/paginator.component";
import type { CategoriesPaginatedPageDto, CategoryDto } from "@am-front/root/api";


@Component({
    selector: "admin-categories",
    templateUrl: "./categories.component.html",
    styleUrls: ["./categories.component.scss"],
    providers: [DestroyService],
    imports: [
        RouterLink,
        AmstoreButtonRoundComponent,
        IconsComponent,
        AsyncPipe,
        DatePipe,
        AmstorePaginatorComponent
    ]
})
export class CategoriesComponent extends FilteredPage {
    public items$: Observable<CategoryDto[]> = this.filterSet$.pipe(
        filter(Boolean),
        switchMap((result: FiltersSet) => this.categories.getCategories(result['page'] as number ?? 1)),
        map((result: CategoriesPaginatedPageDto) => {
                this.pageCount = result.count;
                this.page = result.page;

                return result.items;
            }
        ));

    private categories: CategoriesService = inject(CategoriesService);

    public pageCount: number = 1;
    public page: number;
    public filters: Record<string, unknown>;

    protected initFilters(query: Params): FiltersSet {
        this.page = Number(query["page"]) || 1;

        return {
            page: query["page"]
        };
    }
}
