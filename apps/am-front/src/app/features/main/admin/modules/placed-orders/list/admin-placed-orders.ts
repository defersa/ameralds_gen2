import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, EMPTY, ReplaySubject, startWith, Subject, switchMap } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import type { AdminPlacedOrdersPageDto } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService, type AdminPlacedOrdersFilters } from '@am-front/services/admin-placed-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { AdminOrdersFiltersComponent } from '@am-front/shared/filters/admin-orders/admin-orders-filters.component';
import { OrderSnapshotComponent } from '@am-front/shared/snapshot/order/order-snapshot.component';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Component({
    selector: 'amstore-admin-placed-orders',
    imports: [AdminOrdersFiltersComponent, AmstoreButtonComponent, OrderSnapshotComponent],
    templateUrl: './admin-placed-orders.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlacedOrders {
    private readonly service = inject(AdminPlacedOrdersService);
    private readonly auth = inject(AuthService);
    private readonly profile = inject(ProfileService);
    private readonly retry$ = new Subject<void>();
    private readonly appliedFilters = signal<AdminPlacedOrdersFilters | null>(null);

    public readonly filtersUpdate$ = new ReplaySubject<AdminPlacedOrdersFilters>(1);
    public readonly access = computed(() => this.auth.auth() && this.profile.isAdmin());
    public readonly result = signal<AdminPlacedOrdersPageDto | null>(null);
    public readonly page = signal(1);
    public readonly pagesCount = signal(1);
    public readonly load = createRequestWrapper<typeof this.service.list>(this.service.list.bind(this.service));

    public readonly hasAppliedFilters = computed(() => {
        const filters = this.appliedFilters();

        return !!(filters?.user || filters?.statuses || filters?.from || filters?.to);
    });

    /** Загружает применённые фильтры из общего компонента, отменяет устаревшие запросы и очищает данные при потере доступа. */
    constructor() {
        combineLatest([
            this.filtersUpdate$
                .pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
            toObservable(this.access),
            toObservable(this.auth.token),
        ])
            .pipe(
                switchMap(([filters, access]) => {
                    this.appliedFilters.set(filters);
                    this.page.set(filters.page);
                    this.result.set(null);
                    this.load.clear();

                    if (!access) {
                        this.page.set(1);
                        this.pagesCount.set(1);

                        return EMPTY;
                    }

                    return this.retry$
                        .pipe(
                            startWith(undefined),
                            switchMap(() => this.load.request(filters)),
                        );
                }),
                takeUntilDestroyed(),
            )
            .subscribe(result => {
                this.result.set(result);
                this.page.set(result.page);
                this.pagesCount.set(result.count);
            });
    }

    /** Повторяет текущую загрузку после ошибки без параллельного запроса. */
    public retry(): void {
        if (this.access() && !this.load.loading()) {
            this.retry$.next();
        }
    }
}
