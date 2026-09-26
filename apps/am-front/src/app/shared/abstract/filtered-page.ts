import { DestroyRef, Directive, inject } from "@angular/core";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";


export type FiltersSet = Record<string, unknown>;

@Directive()
export abstract class FilteredPage<T extends FiltersSet = FiltersSet> {
    protected activateRoute: ActivatedRoute = inject(ActivatedRoute);
    protected destroyRef: DestroyRef = inject(DestroyRef);
    protected router: Router = inject(Router);

    protected filterSet$: BehaviorSubject<T> = new BehaviorSubject(null);
    private isSyncingFiltersFromQueryParams: boolean = false;

    constructor() {
        this.initQueryUpdateHandler();
        this.initFiltersWithParams();
    }

    protected abstract initFilters(params: Params): T;

    public setFilter(filters: T): void {
        const filtersSet: T = this.filterSet$.getValue() || {} as T;

        (Object.keys(filters) as Array<keyof T>).forEach((key: keyof T) => {
            const value: T[keyof T] = filters[key];

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
            .subscribe((params: Params) => {
                this.isSyncingFiltersFromQueryParams = true;
                this.setFilter(this.initFilters(params));
                this.isSyncingFiltersFromQueryParams = false;
            })
    }

    private initQueryUpdateHandler(): void {
        this.filterSet$
            .pipe(
                filter(Boolean),
                filter(() => !this.isSyncingFiltersFromQueryParams),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((params: T) =>
                this.router.navigate([], {
                    relativeTo: this.activateRoute,
                    queryParams: params,
                    queryParamsHandling: "replace",
                    state: { "skip": true }
                })
            );
    }
}
