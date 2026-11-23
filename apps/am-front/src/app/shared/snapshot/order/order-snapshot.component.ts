import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent, type IconSize } from '@am-front/cdk/icons/icons.component';
import type { IconsName } from '@am-front/cdk/icons/icons.map';
import { EnumOrderStatus, type OrderCustomerDto, type UserOrderSummaryDto } from '@am-front/root/api-v2';
import { ORDER_STATUS_LABELS } from '@am-front/utils/order-status';


interface OrderStatusAppearance {
    color: 'primary' | 'accent' | 'warn';
    icon: IconsName;
}

const ORDER_STATUS_APPEARANCE = {
    [EnumOrderStatus.Open]: {
        color: 'accent',
        icon: 'time',
    },
    [EnumOrderStatus.PendingPayment]: {
        color: 'accent',
        icon: 'time',
    },
    [EnumOrderStatus.Success]: {
        color: 'primary',
        icon: 'apply',
    },
    [EnumOrderStatus.Cancel]: {
        color: 'warn',
        icon: 'warn',
    },
    [EnumOrderStatus.Refunded]: {
        color: 'warn',
        icon: 'warn',
    },
} satisfies Record<EnumOrderStatus, OrderStatusAppearance>;

@Component({
    selector: 'amstore-order-snapshot',
    imports: [DatePipe, DecimalPipe, RouterLink, AmstoreButtonComponent, IconsComponent],
    templateUrl: './order-snapshot.component.html',
    styleUrl: './order-snapshot.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex min-w-0 overflow-hidden',
        '[class.is-paid]': 'appearance().color === "primary"',
        '[class.is-cancelled]': 'appearance().color === "warn"',
        '[attr.data-status]': 'order().status',
    },
})
export class OrderSnapshotComponent {
    public readonly order: InputSignal<UserOrderSummaryDto> = input.required<UserOrderSummaryDto>();
    /** undefined скрывает сведения о покупателе; null обозначает удалённого пользователя исторического заказа. */
    public readonly customer: InputSignal<OrderCustomerDto | null | undefined> = input<OrderCustomerDto | null>();

    public readonly detailsRoute: InputSignal<string> = input('/account/orders');
    public readonly preserveQueryParams: InputSignal<boolean> = input(false);
    public readonly dateField: InputSignal<'placedAt' | 'createdAt'> = input<'placedAt' | 'createdAt'>('placedAt');
    public readonly timezone: InputSignal<string | undefined> = input<string>();

    public readonly appearance = computed(() => ORDER_STATUS_APPEARANCE[this.order().status]);
    public readonly status = computed(() => ORDER_STATUS_LABELS[this.order().status]);
    public readonly displayDate = computed(() => this.dateField() === 'createdAt'
        ? this.order().createdAt
        : this.order().placedAt ?? this.order().createdAt);
    public readonly desktopIconSize = 100 satisfies IconSize;
}
