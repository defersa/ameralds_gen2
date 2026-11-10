import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, EMPTY, ReplaySubject, Subject, startWith, switchMap } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { EntityDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { UserOrdersFilters, UserOrdersService } from '@am-front/services/user-orders.service';
import { UserOrdersFiltersComponent } from '@am-front/shared/filters/user-orders/user-orders-filters.component';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Component({
    selector: 'amstore-orders',
    templateUrl: './orders.component.html',
    styleUrls: ['./orders.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [UserOrdersFiltersComponent, AmstoreButtonComponent],
})
export class OrdersComponent {
    private readonly service = inject(UserOrdersService);
    private readonly auth = inject(AuthService);
    private readonly retry$ = new Subject<void>();

    public readonly filtersUpdate$ = new ReplaySubject<UserOrdersFilters>(1);
    public readonly orders = signal<EntityDto[]>([]);
    public readonly pagesCount = signal(1);
    public readonly page = signal(1);
    public readonly load = createRequestWrapper<typeof this.service.getOrders>(this.service.getOrders.bind(this.service));

    /** Загружает собственные заказы при смене URL/авторизации, отменяет устаревшие запросы и позволяет повторить неудачную загрузку. */
    constructor() {
        combineLatest([
            this.filtersUpdate$
                .pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
            toObservable(this.auth.auth),
        ])
            .pipe(
                switchMap(([filters, authenticated]) => {
                    this.orders.set([]);
                    this.page.set(filters.page);
                    this.load.clear();

                    if (!authenticated) {
                        this.pagesCount.set(1);
                        this.page.set(1);

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
