import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import type { MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, EMPTY, exhaustMap, filter, merge, Subject, switchMap, timer } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { DialogService } from '@am-front/core/dialog/dialog.service';
import { type AdminPlacedOrderDetailsDto, EnumOrderStatus } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService, type PlacedOrderAction } from '@am-front/services/admin-placed-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { PatternOrderPreviewComponent } from '@am-front/shared/details/pattern-order-preview/pattern-order-preview.component';
import { AmstoreSnapshotPatternComponent } from '@am-front/shared/snapshot/pattern/pattern.component';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';
import { ORDER_STATUS_LABELS } from '@am-front/utils/order-status';
import { OrderActionDialog, type OrderActionDialogData } from '../action-dialog/order-action-dialog';


export const REFUND_LABELS: Record<string, string> = {
    accepted: 'Запрос принят',
    processing: 'Обрабатывается',
    unknown: 'Результат неизвестен, выполняется сверка',
    succeeded: 'Возврат подтверждён',
    failed: 'Окончательный отказ',
};

@Component({
    selector: 'amstore-admin-placed-order-details',
    templateUrl: './admin-placed-order-details.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DatePipe,
        DecimalPipe,
        RouterLink,
        AmstoreButtonComponent,
        AmstoreSnapshotPatternComponent,
        PatternOrderPreviewComponent,
    ],
})
export class AdminPlacedOrderDetails {
    private readonly service = inject(AdminPlacedOrdersService);
    private readonly auth = inject(AuthService);
    private readonly profile = inject(ProfileService);
    private readonly route = inject(ActivatedRoute);
    private readonly dialogs = inject(DialogService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly refresh$ = new Subject<void>();
    private activeDialog: MatDialogRef<OrderActionDialog, AdminPlacedOrderDetailsDto> | null = null;

    public readonly access = computed(() => this.auth.auth() && this.profile.isAdmin());
    public readonly order = signal<AdminPlacedOrderDetailsDto | null>(null);
    public readonly dialogOpen = signal(false);
    public readonly labels = ORDER_STATUS_LABELS;
    public readonly refundLabels = REFUND_LABELS;
    public readonly load = createRequestWrapper<typeof this.service.details>(this.service.details.bind(this.service));

    /** При смене заказа/сессии очищает данные; незавершённые возвраты опрашивает с сервера каждые пять секунд без параллельных запросов. */
    constructor() {
        this.destroyRef.onDestroy(() => this.activeDialog?.close());
        combineLatest([this.route.paramMap, toObservable(this.access), toObservable(this.auth.token)])
            .pipe(
                switchMap(([params, access]) => {
                    this.activeDialog?.close();
                    this.order.set(null);
                    this.load.clear();

                    if (!access) {
                        return EMPTY;
                    }

                    const id = Number(params.get('id'));

                    return merge(
                        this.refresh$,
                        timer(0, 5000).pipe(filter((index) => index === 0 || this.needsPolling())),
                    ).pipe(exhaustMap(() => this.load.request(id)));
                }),
                takeUntilDestroyed(),
            )
            .subscribe((order) => this.order.set(order));
    }

    /** Перечитывает текущие данные и доступность действий, сохраняя состав и последнее известное состояние при ошибке. */
    public refresh(): void {
        if (this.access() && !this.load.loading()) {
            this.refresh$.next();
        }
    }

    /** Открывает типизированное подтверждение; применяет только серверный результат для текущего заказа и действующей сессии. */
    public openAction(action: PlacedOrderAction): void {
        const order = this.order();
        const revision = this.auth.sessionRevision;

        if (
            !this.access() ||
            !order ||
            this.load.status() !== 'success' ||
            this.dialogOpen() ||
            (action === 'cancel' ? !order.canCancel : order.refundUnavailableReason !== null)
        ) {
            return;
        }

        const dialog = this.dialogs.openCustomDialog<
            OrderActionDialog,
            OrderActionDialogData,
            AdminPlacedOrderDetailsDto
        >(OrderActionDialog, {
            width: '640px',
            minWidth: '0',
            maxWidth: 'calc(100vw - 32px)',
            data: {
                order,
                action,
            },
        });

        this.activeDialog = dialog;
        this.dialogOpen.set(true);
        dialog
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
                this.activeDialog = null;
                this.dialogOpen.set(false);

                if (
                    this.access() &&
                    revision === this.auth.sessionRevision &&
                    result &&
                    this.order()?.id === result.id
                ) {
                    this.order.set(result);
                    this.refresh();
                }
            });
    }

    /** Продолжает опрос только во время ожидания оплаты или незавершённой финансовой операции. */
    private needsPolling(): boolean {
        const order = this.order();

        return (
            !!order &&
            (order.status === EnumOrderStatus.PendingPayment ||
                order.refunds
                    .some((refund) => ['accepted', 'processing', 'unknown']
                    .includes(refund.status)))
        );
    }
}
