import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, EMPTY, exhaustMap, filter, Subject, switchMap, take, takeUntil, tap, timer } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import { EnumOrderStatus, EnumPaymentStatus, PaymentAttemptDto, PaymentStateDto, UserOrderDetailsDto } from '@am-front/root/api-v2';
import { PurchaseSyncService } from '@am-front/services/purchase-sync.service';
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
    private readonly purchaseSync = inject(PurchaseSyncService);
    private readonly contextChanged$ = new Subject<void>();
    private paymentKey: string | null = null;

    public readonly load = createRequestWrapper<typeof this.orders.getOrder>(this.orders.getOrder.bind(this.orders));

    public readonly cancelRequest = createRequestWrapper<typeof this.orders.cancelOrder>(
        this.orders.cancelOrder.bind(this.orders),
    );

    public readonly paymentRequest = createRequestWrapper<typeof this.orders.createPayment>(this.orders.createPayment.bind(this.orders));
    public readonly payment = signal<PaymentAttemptDto | null>(null);
    public readonly paymentStatuses = EnumPaymentStatus;
    public readonly paymentState = signal<PaymentStateDto | null>(null);

    public readonly stateRequest = createRequestWrapper<typeof this.orders.getPaymentState>(
        this.orders.getPaymentState.bind(this.orders),
    );

    public readonly order = signal<UserOrderDetailsDto | null>(null);
    public readonly pendingStatus = EnumOrderStatus.PendingPayment;

    public readonly paymentCaptured = computed(() => this.payment()?.status === EnumPaymentStatus.SUCCEEDED ||
        this.paymentState()?.paymentStatus === EnumPaymentStatus.SUCCEEDED);

    public readonly status = computed(() => {
        const order = this.order();

        return order ? ORDER_STATUS_LABELS[order.status] : '';
    });

    /** Загружает собственный заказ; при смене маршрута/авторизации очищает попытку и отменяет устаревшие подписки. */
    constructor() {
        combineLatest([this.route.paramMap, toObservable(this.auth.auth), toObservable(this.auth.token)])
            .pipe(
                switchMap(([params, authenticated]) => {
                    this.contextChanged$.next();
                    this.cancelRequest.clear();
                    this.paymentRequest.clear();
                    this.payment.set(null);
                    this.paymentKey = null;
                    this.paymentState.set(null);
                    this.stateRequest.clear();
                    this.order.set(null);
                    this.load.clear();

                    if (!authenticated) {
                        return EMPTY;
                    }

                    const revision = this.auth.sessionRevision;

                    return this.load.request(Number(params.get('id')))
                        .pipe(
                            filter(() => this.auth.auth() && revision === this.auth.sessionRevision),
                            tap((order) => this.order.set(order)),
                            switchMap(() => timer(0, 5000)
                                .pipe(
                                    take(24),
                                    exhaustMap((index) => {
                                        const current = this.order();

                                        if (!current || (index > 0 && current.status !== this.pendingStatus) ||
                                            this.stateRequest.loading() || this.paymentState()?.resolution) {
                                            return EMPTY;
                                        }

                                        return this.stateRequest.request(current.id)
                                            .pipe(filter(() => this.auth.auth() && revision === this.auth.sessionRevision));
                                    }),
                                )),
                        );
                }),
                takeUntilDestroyed(),
            )
            .subscribe((state) => this.acceptPaymentState(state));
    }

    /** Проверяет результат по явному действию пользователя после ошибки или окончания двухминутного ожидания. */
    public checkPayment(): void {
        const order = this.order();
        const revision = this.auth.sessionRevision;

        if (!order || !this.auth.auth() || this.stateRequest.loading()) {
            return;
        }

        this.stateRequest.request(order.id)
            .pipe(takeUntil(this.contextChanged$))
            .subscribe((state) => {
                if (this.auth.auth() && revision === this.auth.sessionRevision) {
                    this.acceptPaymentState(state);
                }
            });
    }

    /** Принимает только серверный статус текущего заказа; подтверждённая покупка обновляет права и корзину. */
    private acceptPaymentState(state: PaymentStateDto): void {
        if (!this.auth.auth() || state.orderId !== this.order()?.id) {
            return;
        }

        const wasPaid = this.paymentState()?.orderStatus === EnumOrderStatus.Success;

        this.paymentState.set(state);
        this.order.update((order) => order ? { ...order, status: state.orderStatus } : order);

        if (state.orderStatus === EnumOrderStatus.Success && !wasPaid) {
            this.purchaseSync.purchaseConfirmed();
        }
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
            this.cancelRequest.loading() || this.paymentCaptured()) {
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
