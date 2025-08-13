import { DestroyRef, Directive, inject } from "@angular/core";
import { ActivatedRoute, Event, Navigation, NavigationEnd, Params, Router } from "@angular/router";
import { filter, map, tap } from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";


export type FiltersSet = Record<string, unknown>;

@Directive()
export abstract class FilteredPage {
    protected activateRoute: ActivatedRoute = inject(ActivatedRoute);
    protected destroyRef: DestroyRef = inject(DestroyRef);
    protected router: Router = inject(Router);

    protected filterSet$: BehaviorSubject<FiltersSet> = new BehaviorSubject(null);

    constructor() {
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
        this.activateRoute
            .queryParams
            .pipe(
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((params: Params) => this.setFilter(this.initFilters(params)))
    }

    private initQueryUpdateHandler(): void {
        this.filterSet$
            .pipe(
                filter(Boolean),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((params: FiltersSet) =>
                this.router.navigate([], {
                    relativeTo: this.activateRoute,
                    queryParams: params,
                    queryParamsHandling: "",
                    state: { "skip": true }
                })
            );
    }
}
