import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, EMPTY, expand, ReplaySubject, Subject, startWith, switchMap, take, timer } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { UserOrderSummaryDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { UserOrdersFilters, UserOrdersService } from '@am-front/services/user-orders.service';
import { UserOrdersFiltersComponent } from '@am-front/shared/filters/user-orders/user-orders-filters.component';
import { OrderSnapshotComponent } from '@am-front/shared/snapshot/order/order-snapshot.component';
import { isRefundPending } from '@am-front/utils/order-refund-status';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Component({
    selector: 'amstore-orders',
    templateUrl: './orders.component.html',
    styleUrls: ['./orders.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [UserOrdersFiltersComponent, AmstoreButtonComponent, OrderSnapshotComponent],
})
export class OrdersComponent {
    private readonly service = inject(UserOrdersService);
    private readonly auth = inject(AuthService);
    private readonly retry$ = new Subject<void>();

    public readonly filtersUpdate$ = new ReplaySubject<UserOrdersFilters>(1);
    public readonly orders = signal<UserOrderSummaryDto[]>([]);
    public readonly pagesCount = signal(1);
    public readonly page = signal(1);
    public readonly refreshRefunds = createRequestWrapper<typeof this.service.getOrders>(this.service.getOrders.bind(this.service));
    public readonly load = createRequestWrapper<typeof this.service.getOrders>(this.service.getOrders.bind(this.service));

    /** Загружает заказы текущей сессии и опрашивает незавершённые возвраты до двух минут; смена URL/сессии отменяет запросы. */
    constructor() {
        combineLatest([
            this.filtersUpdate$
                .pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
            toObservable(this.auth.auth),
            toObservable(this.auth.token),
        ])
            .pipe(
                switchMap(([filters, authenticated]) => {
                    this.orders.set([]);
                    this.page.set(filters.page);
                    this.load.clear();
                    this.refreshRefunds.clear();

                    if (!authenticated) {
                        this.pagesCount.set(1);
                        this.page.set(1);

                        return EMPTY;
                    }

                    return this.retry$
                        .pipe(
                            startWith(undefined),
                            switchMap(() => this.load.request(filters)
                                .pipe(
                                    expand(response => response.items
                                        .some(order => isRefundPending(order.refund))
                                        ? timer(5000)
                                            .pipe(switchMap(() => this.refreshRefunds.request(filters)))
                                        : EMPTY, 1),
                                    take(25),
                                )),
                        );
                }),
                takeUntilDestroyed(),
            )
            .subscribe(response => {
                this.orders.set(response.items);
                this.pagesCount.set(response.count);
                this.page.set(response.page);
            });
    }

    /** Повторяет последний запрос после ошибки; повторная отправка во время загрузки блокируется. */
    public retry(): void {
        if (this.load.loading() || !this.auth.auth()) {
            return;
        }

        this.retry$.next();
    }
}
