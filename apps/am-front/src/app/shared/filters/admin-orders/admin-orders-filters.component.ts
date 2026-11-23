import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, type InputSignal, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, maxDate, maxLength, minDate } from '@angular/forms/signals';
import { ActivatedRoute, type ParamMap, Router } from '@angular/router';
import { MAX_PAGE_NUMBER } from '@ameralds/utils';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import { AmstorePaginatorComponent } from '@am-front/cdk/paginator/paginator.component';
import { AmstorePanelExpandComponent, AmstorePanelHeaderComponent } from '@am-front/cdk/panel/panel-expand/panel-expand.component';
import { AmstoreDatepickerSignalComponent, AmstoreInputSignalComponent, AmstoreSelectSignalComponent } from '@am-front/cdk/signal-forms';
import { EnumOrderStatus } from '@am-front/root/api-v2';
import type { AdminPlacedOrdersFilters } from '@am-front/services/admin-placed-orders.service';
import { ORDER_STATUS_LABELS } from '@am-front/utils/order-status';


interface AdminOrdersFilterModel {
    user: string;
    statuses: EnumOrderStatus[];
    startDate: Date | null;
    endDate: Date | null;
    pageSize: number;
}

const DEFAULT_FILTERS: AdminOrdersFilterModel = {
    user: '',
    statuses: [],
    startDate: null,
    endDate: null,
    pageSize: 20,
};

const FILTER_APPLY_DEBOUNCE = 1000;

@Component({
    selector: 'amstore-admin-orders-filters',
    templateUrl: './admin-orders-filters.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormField,
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreButtonComponent,
        IconsComponent,
        AmstorePaginatorComponent,
        AmstoreInputSignalComponent,
        AmstoreDatepickerSignalComponent,
        AmstoreSelectSignalComponent,
    ],
    host: {
        class: 'amstore-filters',
    },
})
export class AdminOrdersFiltersComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    public readonly pagesCount: InputSignal<number> = input(1);
    public readonly page: InputSignal<number> = input(1);
    public readonly filtersUpdate = output<AdminPlacedOrdersFilters>();

    public readonly statusItems = [
        EnumOrderStatus.PendingPayment,
        EnumOrderStatus.Success,
        EnumOrderStatus.Cancel,
        EnumOrderStatus.Refunded,
    ]
        .map(value => ({
            value,
            label: ORDER_STATUS_LABELS[value],
        }));

    public readonly model = signal<AdminOrdersFilterModel>({ ...DEFAULT_FILTERS });

    public readonly pageSizeItems = computed(() => [...new Set([10, 20, 50, 100, this.model().pageSize])]
        .sort((a, b) => a - b)
        .map(value => ({
            value,
            label: String(value),
        })));

    public readonly filterForm = form(this.model, path => {
        maxLength(path.user, 254);
        maxDate(path.startDate, ({ valueOf }) => valueOf(path.endDate) ?? undefined, {
            message: 'Начало периода должно быть не позже конца',
        });
        minDate(path.endDate, ({ valueOf }) => valueOf(path.startDate) ?? undefined, {
            message: 'Конец периода должен быть не раньше начала',
        });
    });

    public readonly hasFilters = computed(() => {
        const values = this.model();

        return !!(values.user || values.statuses.length || values.startDate || values.endDate || values.pageSize !== DEFAULT_FILTERS.pageSize);
    });

    /** Восстанавливает URL и автоматически применяет корректный ввод после паузы, сбрасывая страницу на первую. */
    constructor() {
        const params = toSignal(this.route.queryParamMap, {
            initialValue: this.route.snapshot.queryParamMap,
        });

        effect(() => {
            const current = params();

            untracked(() => this.setFilter(current));
        });

        effect(onCleanup => {
            const values = this.model();

            if (!this.filterForm().dirty() || this.filterForm().invalid()) {
                return;
            }

            const timeout = setTimeout(() => this.updateQuery(values, 1), FILTER_APPLY_DEBOUNCE);

            onCleanup(() => clearTimeout(timeout));
        });
    }

    /** Переключает страницу сразу; незавершённое изменение фильтра применяет с первой страницы, не отправляя невалидный ввод. */
    public handlePagination(page: number): void {
        if (!Number.isSafeInteger(page) || page < 1 || page > this.pagesCount() || this.filterForm().invalid()) {
            return;
        }

        const nextPage = this.filterForm().dirty() ? 1 : page;
        const values = this.model();

        this.filterForm().reset(values);
        this.updateQuery(values, nextPage);
    }

    /** Сбрасывает поля, размер страницы и URL, не переключая раскрытие панели. */
    public clearFilters(event: MouseEvent): void {
        event.stopPropagation();
        this.filterForm().reset({ ...DEFAULT_FILTERS });
        this.updateQuery(DEFAULT_FILTERS, 1);
    }

    /** Читает совместные фильтры из URL и передаёт календарные границы в API без сдвига часового пояса. */
    private setFilter(params: ParamMap): void {
        const selected = (params.get('statuses') ?? '')
            .split(',');
        const page = Number(params.get('page'));
        const pageSize = Number(params.get('pageSize') ?? DEFAULT_FILTERS.pageSize);

        const values: AdminOrdersFilterModel = {
            user: params.get('user') ?? '',
            statuses: this.statusItems
                .filter(item => selected
                    .includes(item.value))
                .map(item => item.value),
            startDate: parseCalendarDate(params.get('from')),
            endDate: parseCalendarDate(params.get('to')),
            pageSize: Number.isSafeInteger(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : DEFAULT_FILTERS.pageSize,
        };

        this.filterForm().reset(values);

        if (this.filterForm().invalid()) {
            return;
        }

        this.filtersUpdate.emit({
            page: Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE_NUMBER ? page : 1,
            pageSize: values.pageSize,
            statuses: values.statuses.length ? values.statuses
                .join(',') : undefined,
            user: values.user.trim() || undefined,
            from: values.startDate ? formatDate(values.startDate, 'yyyy-MM-dd', 'en-US') : undefined,
            to: values.endDate ? formatDate(values.endDate, 'yyyy-MM-dd', 'en-US') : undefined,
        });
    }

    /** Сохраняет только применённые фильтры; обе даты обозначают целые календарные дни UTC на сервере. */
    private updateQuery(values: AdminOrdersFilterModel, page: number): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                user: values.user.trim() || null,
                statuses: values.statuses.length ? values.statuses
                    .join(',') : null,
                from: values.startDate ? formatDate(values.startDate, 'yyyy-MM-dd', 'en-US') : null,
                to: values.endDate ? formatDate(values.endDate, 'yyyy-MM-dd', 'en-US') : null,
                pageSize: values.pageSize === DEFAULT_FILTERS.pageSize ? null : values.pageSize,
                page: page === 1 ? null : page,
            },
            queryParamsHandling: 'replace',
        });
    }
}

/** Читает календарную дату для общего datepicker; её локальное представление сохраняет выбранный день UTC из URL. */
function parseCalendarDate(value: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00`);

    return Number.isFinite(date.getTime()) && formatDate(date, 'yyyy-MM-dd', 'en-US') === value ? date : null;
}
