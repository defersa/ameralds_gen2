import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, EMPTY, Subject, switchMap, takeUntil } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import { EnumOrderStatus, EnumPaymentStatus, PaymentAttemptDto, UserOrderDetailsDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { UserOrdersService } from '@am-front/services/user-orders.service';
import { PatternOrderPreviewComponent } from '@am-front/shared/details/pattern-order-preview/pattern-order-preview.component';
import { AmstoreSnapshotPatternComponent } from '@am-front/shared/snapshot/pattern/pattern.component';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';
import { ORDER_STATUS_LABELS } from '@am-front/utils/order-status';


@Component({
    selector: 'amstore-user-order-details',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './order-details.component.html',
    imports: [DatePipe, DecimalPipe, RouterLink, AmstoreButtonComponent, IconsComponent, AmstoreSnapshotPatternComponent, PatternOrderPreviewComponent],
})
export class OrderDetailsComponent {
    private readonly orders = inject(UserOrdersService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly contextChanged$ = new Subject<void>();
    private paymentKey: string | null = null;

    public readonly load = createRequestWrapper<typeof this.orders.getOrder>(this.orders.getOrder.bind(this.orders));

    public readonly cancelRequest = createRequestWrapper<typeof this.orders.cancelOrder>(
        this.orders.cancelOrder.bind(this.orders),
    );

    public readonly paymentRequest = createRequestWrapper<typeof this.orders.createPayment>(this.orders.createPayment.bind(this.orders));
    public readonly payment = signal<PaymentAttemptDto | null>(null);
    public readonly paymentStatuses = EnumPaymentStatus;

    public readonly order = signal<UserOrderDetailsDto | null>(null);
    public readonly pendingStatus = EnumOrderStatus.PendingPayment;

    public readonly status = computed(() => {
        const order = this.order();

        return order ? ORDER_STATUS_LABELS[order.status] : '';
    });

    /** Загружает собственный заказ; при смене маршрута/авторизации очищает попытку и отменяет устаревшие подписки. */
    constructor() {
        combineLatest([this.route.paramMap, toObservable(this.auth.auth)])
            .pipe(
                switchMap(([params, authenticated]) => {
                    this.contextChanged$.next();
                    this.cancelRequest.clear();
                    this.paymentRequest.clear();
                    this.payment.set(null);
                    this.paymentKey = null;
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

    /** Отменяет ожидающий оплаты заказ, блокируя запрос во время создания платежа; сохраняет отображаемый состав. */
    public cancelOrder(): void {
        const order = this.order();
        const sessionRevision = this.auth.sessionRevision;

        if (!this.auth.auth() || !order || order.status !== this.pendingStatus || this.cancelRequest.loading() || this.paymentRequest.loading()) {
            return;
        }

        this.cancelRequest.request(order.id)
            .pipe(takeUntil(this.contextChanged$))
            .subscribe(summary => {
                if (!this.auth.auth() || this.auth.sessionRevision !== sessionRevision) {
                    return;
                }

                this.order.update(current => current?.id === order.id ? {
                    ...current,
                    ...summary,
                } : current);
            });
    }

    /** Создаёт/восстанавливает попытку и открывает ссылку; после таймаута сохраняет UUID, после отказа допускает новый. */
    public pay(): void {
        const order = this.order();
        const sessionRevision = this.auth.sessionRevision;

        if (!this.auth.auth() || !order || order.status !== this.pendingStatus || this.paymentRequest.loading() ||
            this.cancelRequest.loading() || this.payment()?.status === EnumPaymentStatus.SUCCEEDED) {
            return;
        }

        this.paymentKey ??= crypto.randomUUID();
        this.payment.set(null);

        this.paymentRequest.request(order.id, this.paymentKey)
            .pipe(takeUntil(this.contextChanged$))
            .subscribe(payment => {
                if (!this.auth.auth() || this.auth.sessionRevision !== sessionRevision || this.order()?.id !== order.id) {
                    return;
                }

                this.payment.set(payment);

                if (payment.status === EnumPaymentStatus.FAILED || payment.status === EnumPaymentStatus.CANCELLED) {
                    this.paymentKey = null;

                    return;
                }

                this.orders.redirectToPayment(payment);
            });
    }
}
