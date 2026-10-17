import { Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { AdminOrderListDto, AdminOrdersPaginatedPageDto } from '@am-front/root/api-v2';
import { AdminOrdersService } from '@am-front/services/admin-orders.service';
import { OrdersFilterComponent, OrdersFilterValues } from '@am-front/shared/filters/orders/orders-filter.component';
import { LangTextComponent } from '@am-front/shared/lang-text/lang-text.component';
import { loadingHandler } from '@am-front/utils/loading-with';


@Component({
    selector: "amstore-admin-orders-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.scss"],
    imports: [
        DatePipe,
        OrdersFilterComponent,
        LangTextComponent,
    ],
})
export class IndexComponent {
    private readonly adminOrdersService: AdminOrdersService = inject(AdminOrdersService);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    public readonly orders: WritableSignal<AdminOrderListDto[]> = signal([]);
    public readonly pagesCount: WritableSignal<number> = signal(1);
    public readonly loading: WritableSignal<boolean> = signal(false);
    public readonly loadFailed: WritableSignal<boolean> = signal(false);

    public readonly filtersUpdate$: Subject<OrdersFilterValues> = new Subject();

    constructor() {
        this.filtersUpdate$
            .pipe(
                distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
                switchMap(({ page, email, vk, startDate, endDate }: OrdersFilterValues) => {
                    this.loadFailed.set(false);

                    return this.adminOrdersService.getOrders(page, email, vk, startDate, endDate)
                        .pipe(
                            loadingHandler(this.loading),
                            catchError(() => {
                                this.loadFailed.set(true);

                                return of<AdminOrdersPaginatedPageDto>({ page, count: 0, items: [] });
                            }),
                        );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((response: AdminOrdersPaginatedPageDto) => {
                this.orders.set(response.items);
                this.pagesCount.set(response.count);
            });
    }
}
