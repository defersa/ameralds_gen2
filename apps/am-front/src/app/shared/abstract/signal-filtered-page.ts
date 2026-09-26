import { DestroyRef, Directive, effect, inject, signal, Signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Params, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { FieldTree } from '@angular/forms/signals';


export type FiltersSet = Record<string, unknown>;

@Directive()
export abstract class FilteredPage<T extends FiltersSet = FiltersSet> {
    protected activateRoute: ActivatedRoute = inject(ActivatedRoute);
    protected router: Router = inject(Router);

    protected readonly filterSet: WritableSignal<T> = signal(null);
    protected readonly abstract filterForm: FieldTree<T>;

    protected constructor() {
        this.initQueryUpdateHandler();
        this.initFiltersWithParams();
    }

    protected abstract initFilters(params: Params): T;

    public setFilter(filters: T): void {
        const filtersSet: T = { ...this.filterSet()};

        (Object.keys(filters) as Array<keyof T>).forEach((key: keyof T) => {
            const value: T[keyof T] = filters[key];

            if (!(Array.isArray(value) ? value.length : value)) {
                delete filtersSet[key];
                return;
            }

            filtersSet[key] = value;
        });

        this.filterSet.set(filtersSet);
    }

    private initFiltersWithParams(): void {
        const queryParams: Signal<Params> = toSignal(
            this.activateRoute.queryParams, {
                initialValue: this.activateRoute.snapshot.queryParams,
            });

        effect(() => {
            const params: Params = queryParams();

            this.filterForm().reset();
            this.setFilter(this.initFilters(params));
        });
    }

    private initQueryUpdateHandler(): void {
        effect(() => {
            const params: Params = this.filterSet();

            if (!this.filterForm().touched()) {
                return;
            }

            this.router.navigate([], {
                relativeTo: this.activateRoute,
                queryParams: params,
                queryParamsHandling: "replace",
                state: { "skip": true }
            })
        });
    }
}
