import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { form, FormField, maxDate, minDate } from '@angular/forms/signals';
import {
    AmstorePanelExpandComponent,
    AmstorePanelHeaderComponent
} from "@am-front/cdk/panel/panel-expand/panel-expand.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AmstoreDatepickerSignalComponent, AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { AmstorePaginatorComponent } from '@am-front/cdk/paginator/paginator.component';


export interface OrdersFilterValues {
    email: string;
    vk: string;
    startDate: Date | null;
    endDate: Date | null;
    page: number;
}

const DEFAULT_FORM_VALUES: OrdersFilterValues = {
    email: '',
    vk: '',
    startDate: null,
    endDate: null,
    page: 1,
};

const FILTER_APPLY_DEBOUNCE: number = 1_000;


@Component({
    selector: "amstore-orders-filter",
    templateUrl: "./orders-filter.component.html",
    styleUrls: ["./orders-filter.component.scss"],
    imports: [
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreButtonComponent,
        IconsComponent,
        AmstoreInputSignalComponent,
        AmstoreDatepickerSignalComponent,
        AmstorePaginatorComponent,
        FormField,
    ],
    host: {
        class: "amstore-filters"
    }
})
export class OrdersFilterComponent {
    private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);
    private readonly router: Router = inject(Router);

    public readonly pagesCount = input(1);
    public readonly filtersUpdate = output<OrdersFilterValues>();

    public readonly filterSet = signal<OrdersFilterValues>({ ...DEFAULT_FORM_VALUES });
    public readonly filterForm = form(this.filterSet, (path) => {
        maxDate(path.startDate, ({ valueOf }) => valueOf(path.endDate) ?? undefined, {
            message: 'Начало периода должно быть не позже конца',
        });
        minDate(path.endDate, ({ valueOf }) => valueOf(path.startDate) ?? undefined, {
            message: 'Конец периода должен быть не раньше начала',
        });
    });
    public readonly hasFilters = computed(() => {
        const { email, vk, startDate, endDate } = this.filterSet();

        return Boolean(email || vk || startDate || endDate);
    });

    constructor() {
        const queryParams = toSignal(this.activatedRoute.queryParamMap, {
            initialValue: this.activatedRoute.snapshot.queryParamMap,
        });

        effect(() => this.setFilter(queryParams()));

        effect((onCleanup) => {
            const values: OrdersFilterValues = this.filterSet();

            if (!this.filterForm().dirty() || this.filterForm().invalid()) {
                return;
            }

            const timeout = setTimeout(() => {
                this.updateQueryParams({ ...values, page: 1 });
            }, FILTER_APPLY_DEBOUNCE);

            onCleanup(() => clearTimeout(timeout));
        });
    }

    public handlePagination(page: number): void {
        this.updateQueryParams({ ...this.filterSet(), page });
    }

    public clearFilters(event: MouseEvent): void {
        event.stopPropagation();

        this.filterForm().reset();
        this.filterSet.set({ ...DEFAULT_FORM_VALUES });
        this.updateQueryParams(DEFAULT_FORM_VALUES);
    }

    private setFilter(params: ParamMap): void {
        const page = Number(params.get('page'));
        const values: OrdersFilterValues = {
            email: params.get('email') ?? '',
            vk: params.get('vk') ?? '',
            startDate: parseDateFilter(params.get('startDate')),
            endDate: parseDateFilter(params.get('endDate')),
            page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        };

        this.filterForm().reset();
        this.filterSet.set(values);
        this.filtersUpdate.emit(values);
    }

    private updateQueryParams(values: OrdersFilterValues): void {
        const params: Params = {
            email: values.email.trim() || null,
            vk: values.vk.trim() || null,
            startDate: values.startDate ? formatDate(values.startDate, 'yyyy-MM-dd', 'en-US') : null,
            endDate: values.endDate ? formatDate(values.endDate, 'yyyy-MM-dd', 'en-US') : null,
            page: values.page === 1 ? null : values.page,
        };

        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: params,
            queryParamsHandling: 'replace',
        });
    }
}

function parseDateFilter(value: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(value);

    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
        ? new Date(`${value}T00:00:00`)
        : null;
}
