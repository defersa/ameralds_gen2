import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, EMPTY, switchMap } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { EnumOrderStatus, UserOrderDetailsDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { UserOrdersService } from '@am-front/services/user-orders.service';
import { PatternOrderPreviewComponent } from '@am-front/shared/details/pattern-order-preview/pattern-order-preview.component';
import { AmstoreSnapshotPatternComponent } from '@am-front/shared/snapshot/pattern/pattern.component';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


const ORDER_STATUSES = {
    [EnumOrderStatus.Open]: 'Корзина',
    [EnumOrderStatus.PendingPayment]: 'Ожидает оплаты',
    [EnumOrderStatus.Success]: 'Оплачен',
    [EnumOrderStatus.Cancel]: 'Отменён',
    [EnumOrderStatus.PartiallyRefunded]: 'Частичный возврат',
    [EnumOrderStatus.Refunded]: 'Возврат',
} satisfies Record<EnumOrderStatus, string>;

@Component({
    selector: 'amstore-user-order-details',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './order-details.component.html',
    imports: [DatePipe, DecimalPipe, RouterLink, AmstoreButtonComponent, AmstoreSnapshotPatternComponent, PatternOrderPreviewComponent],
})
export class OrderDetailsComponent {
    private readonly orders = inject(UserOrdersService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);

    public readonly load = createRequestWrapper<typeof this.orders.getOrder>(this.orders.getOrder.bind(this.orders));
    public readonly order = signal<UserOrderDetailsDto | null>(null);
    public readonly pendingStatus = EnumOrderStatus.PendingPayment;

    public readonly status = computed(() => {
        const order = this.order();

        return order ? ORDER_STATUSES[order.status] : '';
    });

    /** Загружает собственный заказ по URL, отменяет прежний запрос при смене маршрута и очищает данные при выходе. */
    constructor() {
        combineLatest([this.route.paramMap, toObservable(this.auth.auth)])
            .pipe(
                switchMap(([params, authenticated]) => {
                    this.order.set(null);
                    this.load.clear();

                    if (!authenticated) {
                        return EMPTY;
                    }

                    return this.load.request(Number(params.get('id')));
                }),
                takeUntilDestroyed(),
            )
            .subscribe((order) => this.order.set(order));
    }
}
