import { DestroyRef, Directive, inject } from "@angular/core";
import { ActivatedRoute, Event, Navigation, NavigationEnd, Params, Router } from "@angular/router";
import { filter, map } from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";


export type FiltersSet = Record<string, unknown>;

@Directive()
export abstract class FilteredPage {
    protected activateRoute: ActivatedRoute = inject(ActivatedRoute);
    protected destroyRef: DestroyRef = inject(DestroyRef);
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
        // TODO: REEEEWORK
        this.router.events
            .pipe(
                filter((event: Event) => event instanceof NavigationEnd),
                map(() => this.router.getCurrentNavigation()),
                filter((navigation: Navigation) => !navigation.extras?.state?.["skip"] || navigation.trigger === "popstate"),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.setFilter(this.initFilters(this.activateRoute.snapshot.queryParams)));
    }

    private initQueryUpdateHandler(): void {
        this.filterSet$
            .pipe(
                filter(Boolean),
                takeUntilDestroyed(this.destroyRef)
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
