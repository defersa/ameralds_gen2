import {
    Component, computed,
    effect,
    EffectCleanupRegisterFn,
    inject,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    signal,
    Signal,
    WritableSignal
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SizesService } from '@am-front/services/sizes.service';
import { CategoriesService } from '@am-front/services/categories.service';
import { OptionType } from '@am-front/interface/cdk.interface';
import {
    AmstorePanelExpandComponent,
    AmstorePanelHeaderComponent
} from '@am-front/cdk/panel/panel-expand/panel-expand.component';
import { AmstorePaginatorComponent } from '@am-front/cdk/paginator/paginator.component';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FieldTree, form, FormField } from '@angular/forms/signals';
import { toSignal } from '@angular/core/rxjs-interop';
import { AmstoreCheckboxListSignalComponent, AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';


export interface PatternsFilterValues {
    sizes: number[];
    categories: number[];
    query: string;
    page?: number;
    immediately?: boolean;
}

const DEFAUL_FORM_VALUES: PatternsFilterValues = {
    sizes: [],
    categories: [],
    query: '',
    page: 1,
}

const FILTER_APPLY_DEBOUNCE: number = 1_000;

@Component({
    selector: 'amstore-pattern-filters',
    templateUrl: './patterns-filters.component.html',
    styleUrls: ['./patterns-filters.component.scss'],
    imports: [
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        ReactiveFormsModule,
        AmstorePaginatorComponent,
        AmstoreCheckboxListSignalComponent,
        FormField,
        AmstoreInputSignalComponent,
        AmstoreButtonComponent,
        IconsComponent
    ],
    host: {
        class: 'amstore-filters'
    }
})
export class AmstorePatternsFilterComponent {
    private readonly sizeService: SizesService = inject(SizesService);
    private readonly categoriesService: CategoriesService = inject(CategoriesService);
    private readonly activateRoute: ActivatedRoute = inject(ActivatedRoute);
    private readonly router: Router = inject(Router);

    public readonly categoriesList: Signal<OptionType[]> = this.categoriesService.categoriesList;
    public readonly sizesList: Signal<OptionType[]> = this.sizeService.sizesList;

    public readonly pagesCount: InputSignal<number> = input(1);
    public readonly filtersUpdate: OutputEmitterRef<PatternsFilterValues> = output<PatternsFilterValues>();

    public readonly filterSet: WritableSignal<PatternsFilterValues> = signal(DEFAUL_FORM_VALUES);
    public readonly filterForm: FieldTree<PatternsFilterValues> = form(this.filterSet);

    public readonly hasFilters: Signal<boolean> = computed(() => {
        const value: PatternsFilterValues = { ...this.filterSet() };

        delete value.page;

        return Object.values(value).some((value: unknown) => Boolean(Array.isArray(value) ? value.length : value));
    })

    constructor() {
        this.initQueryUpdateHandler();
        this.initFiltersWithParams();
    }

    public setFilter(params: Params): void {
        const sizes: number[] = ParamsToArray(params['sizes']);
        const categories: number[] = ParamsToArray(params['categories']);
        const page: number = Number(params['page']) || 1;
        const query: string = params['query'] ?? '';

        this.filterForm().reset();
        this.filterSet.set({ sizes, categories, page, query, immediately: false });
        this.filtersUpdate.emit({ sizes, categories, page, query });
    }

    public handlePagination(page: number): void {
        this.filterForm().markAsTouched();
        this.filterSet.set({
            ...this.filterSet(),
            page,
            immediately: true,
        })
    }

    public clearFilters(event: MouseEvent): void {
        event.stopPropagation();

        this.filterForm().markAsTouched();
        this.filterSet.set({
            ...DEFAUL_FORM_VALUES,
            immediately: true,
        });
    }

    public clearQuery(): void {
        if (!this.filterSet().query) {
            return;
        }

        this.filterForm().markAsTouched();
        this.filterSet.set({
            ...this.filterSet(),
            query: '',
            page: 1,
            immediately: true,
        });
    }

    private initFiltersWithParams(): void {
        const queryParams: Signal<Params> = toSignal(
            this.activateRoute.queryParams, {
                initialValue: this.activateRoute.snapshot.queryParams
            });

        effect(() => {
            const params: Params = queryParams();

            this.setFilter(params);
        });
    }

    private initQueryUpdateHandler(): void {
        effect((onCleanup: EffectCleanupRegisterFn) => {
            const filterValues: PatternsFilterValues = this.filterSet();

            if (!this.filterForm().touched()) {
                return;
            }

            const params: Params = Object.fromEntries(
                Object.entries(filterValues)
                    .filter(([, value]: [string, unknown]) => Boolean(Array.isArray(value) ? value.length : value))
                    .map(([key, value]: [string, unknown]) => [key, value]),
                );

            delete params['immediately'];
            if (params['page'] === 1) {
                delete params['page'];
            }

            const timeout: number = setTimeout(() => {
                this.router.navigate([], {
                    relativeTo: this.activateRoute,
                    queryParams: params,
                    queryParamsHandling: 'replace',
                    state: { 'skip': true }
                });
            }, (filterValues.immediately ? 0 : FILTER_APPLY_DEBOUNCE));

            onCleanup(() => {
                clearTimeout(timeout);
            });
        });
    }
}

function ParamsToArray(value: any): number[] {
    return (typeof value === 'string' ? [value] : value as [])?.map(Number) || [];
}
