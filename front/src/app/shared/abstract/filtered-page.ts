import { Directive, inject } from "@angular/core";
import {
    ActivatedRoute, Params, Router, Event, NavigationEnd, Navigation
} from "@angular/router";
import { filter, map, takeUntil } from "rxjs/operators";
import { DestroyService } from "@am/utils/destroy.service";
import { BehaviorSubject } from "rxjs";


export type FiltersSet = Record<string, unknown>;

@Directive({
    providers: [
        DestroyService,
    ]
})
export abstract class FilteredPage {
    protected onDestroy: DestroyService = inject(DestroyService);
    protected activateRoute: ActivatedRoute = inject(ActivatedRoute);
    protected router: Router = inject(Router);

    protected filterSet$: BehaviorSubject<FiltersSet> = new BehaviorSubject(null);

    public constructor() {
        this.initFiltersWithParams();
        this.initQueryUpdateHandler();
    }

    protected abstract initFilters(params: Params): FiltersSet;

    public setFilter(filters: FiltersSet): void {
        const filtersSet: FiltersSet = this.filterSet$.getValue() || {};

        Object.entries(filters).forEach(([key, value]: [string, unknown]) => {
            if (!(Array.isArray(value) ? value.length : value)) {
                delete filtersSet[key];
                return;
            }
            filtersSet[key] = value;
        });

        this.filterSet$.next(filtersSet);
    }

    private initFiltersWithParams(): void {
        this.router.events
            .pipe(
                takeUntil(this.onDestroy),
                filter((event: Event) => event instanceof NavigationEnd),
                map(() => this.router.getCurrentNavigation()),
                filter((navigation: Navigation) => !navigation.extras?.state?.['skip'] || navigation.trigger === 'popstate')
            )
            .subscribe(() => this.setFilter(this.initFilters(this.activateRoute.snapshot.queryParams)));
    }

    private initQueryUpdateHandler(): void {
        this.filterSet$
            .pipe(
                takeUntil(this.onDestroy),
                filter((result: FiltersSet) => !!result))
            .subscribe((params: FiltersSet) =>
                this.router.navigate([], {
                    relativeTo: this.activateRoute,
                    queryParams: params,
                    queryParamsHandling: '',
                    state: {'skip': true}
                })
            );
    }
}
