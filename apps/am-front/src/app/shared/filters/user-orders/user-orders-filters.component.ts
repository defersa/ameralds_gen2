import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, max, maxDate, min, minDate } from '@angular/forms/signals';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MAX_PAGE_NUMBER } from '@ameralds/utils';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstorePaginatorComponent } from '@am-front/cdk/paginator/paginator.component';
import { AmstorePanelExpandComponent, AmstorePanelHeaderComponent } from '@am-front/cdk/panel/panel-expand/panel-expand.component';
import { AmstoreDatepickerSignalComponent, AmstoreInputSignalComponent, AmstoreSelectSignalComponent } from '@am-front/cdk/signal-forms';
import { EnumOrderStatus } from '@am-front/root/api-v2';
import type { UserOrdersFilters } from '@am-front/services/user-orders.service';


interface UserOrdersFilterModel {
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    minPrice: number | null;
    maxPrice: number | null;
}

const DEFAULT_FILTERS: UserOrdersFilterModel = {
    status: '',
    startDate: null,
    endDate: null,
    minPrice: null,
    maxPrice: null,
};

@Component({
    selector: 'amstore-user-orders-filters',
    templateUrl: './user-orders-filters.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormField,
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreButtonComponent,
        AmstorePaginatorComponent,
        AmstoreDatepickerSignalComponent,
        AmstoreInputSignalComponent,
        AmstoreSelectSignalComponent,
    ],
    host: { class: 'amstore-filters' },
})
export class UserOrdersFiltersComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    public readonly pagesCount = input(1);
    public readonly page = input(1);
    public readonly filtersUpdate = output<UserOrdersFilters>();
    public readonly statuses = [
        {
            value: EnumOrderStatus.PendingPayment,
            label: 'Ожидает оплаты',
        },
        {
            value: EnumOrderStatus.Success,
            label: 'Оплачен',
        },
        {
            value: EnumOrderStatus.Cancel,
            label: 'Отменён',
        },
        {
            value: EnumOrderStatus.PartiallyRefunded,
            label: 'Частичный возврат',
        },
        {
            value: EnumOrderStatus.Refunded,
            label: 'Возврат',
        },
    ];

    public readonly statusItems = [
        {
            value: '',
            label: 'Все статусы',
        },
        ...this.statuses,
    ];

    public readonly model = signal<UserOrdersFilterModel>({ ...DEFAULT_FILTERS });

    public readonly filterForm = form(this.model, path => {
        maxDate(path.startDate, ({ valueOf }) => valueOf(path.endDate) ?? undefined, {
            message: 'Начало периода должно быть не позже конца',
        });
        minDate(path.endDate, ({ valueOf }) => valueOf(path.startDate) ?? undefined, {
            message: 'Конец периода должен быть не раньше начала',
        });
        min(path.minPrice, 0);
        min(path.maxPrice, 0);
        max(path.minPrice, ({ valueOf }) => valueOf(path.maxPrice) ?? Number.MAX_SAFE_INTEGER / 100);
        max(path.maxPrice, Number.MAX_SAFE_INTEGER / 100);
    });

    public readonly hasFilters = computed(() => Object.values(this.model())
        .some(value => value !== '' && value !== null));

    /** Восстанавливает фильтры из URL и применяет валидные изменения с задержкой, сбрасывая страницу на первую. */
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

            const timer = setTimeout(() => this.updateQuery(values, 1), 500);

            onCleanup(() => clearTimeout(timer));
        });
    }

    /** Переключает страницу без задержки; незавершённый или невалидный ввод не применяется. */
    public handlePagination(page: number): void {
        if (this.filterForm().invalid()) {
            return;
        }

        this.filterForm().reset(this.model());
        this.updateQuery(this.model(), page);
    }

    /** Сбрасывает фильтры и страницу, не переключая раскрытие панели. */
    public clearFilters(event: MouseEvent): void {
        event.stopPropagation();
        this.filterForm().reset({ ...DEFAULT_FILTERS });
        this.updateQuery(DEFAULT_FILTERS, 1);
    }

    /** Читает URL, проверяет значения и передаёт применённые фильтры в API в минимальных денежных единицах. */
    private setFilter(params: ParamMap): void {
        const status = this.statuses
            .find(item => item.value === params.get('status'))?.value;
        const page = Number(params.get('page'));

        const values: UserOrdersFilterModel = {
            status: status ?? '',
            startDate: parseDate(params.get('startDate')),
            endDate: parseDate(params.get('endDate')),
            minPrice: parsePrice(params.get('minPrice')),
            maxPrice: parsePrice(params.get('maxPrice')),
        };

        this.filterForm().reset(values);

        if (this.filterForm().invalid()) {
            return;
        }

        const createdBefore = values.endDate ? new Date(values.endDate) : undefined;

        createdBefore?.setDate(createdBefore.getDate() + 1);
        this.filtersUpdate.emit({
            page: Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE_NUMBER ? page : 1,
            status,
            createdFrom: values.startDate ?? undefined,
            createdBefore,
            minAmount: values.minPrice === null ? undefined : Math.round(values.minPrice * 100),
            maxAmount: values.maxPrice === null ? undefined : Math.round(values.maxPrice * 100),
        });
    }

    /** Сохраняет фильтры в URL; пустые значения удаляет, нулевую цену сохраняет. */
    private updateQuery(values: UserOrdersFilterModel, page: number): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                status: values.status || null,
                startDate: values.startDate ? formatDate(values.startDate, 'yyyy-MM-dd', 'en-US') : null,
                endDate: values.endDate ? formatDate(values.endDate, 'yyyy-MM-dd', 'en-US') : null,
                minPrice: values.minPrice,
                maxPrice: values.maxPrice,
                page: page === 1 ? null : page,
            },
            queryParamsHandling: 'replace',
        });
    }
}

/** Читает календарную дату в локальном часовом поясе; некорректные даты игнорирует. */
function parseDate(value: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00`);

    return Number.isFinite(date.getTime()) && formatDate(date, 'yyyy-MM-dd', 'en-US') === value ? date : null;
}

/** Читает неотрицательную цену в основных денежных единицах, включая ноль; некорректное значение игнорирует. */
function parsePrice(value: string | null): number | null {
    if (value === null || value.trim() === '') {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) && number >= 0 && number <= Number.MAX_SAFE_INTEGER / 100 ? number : null;
}
