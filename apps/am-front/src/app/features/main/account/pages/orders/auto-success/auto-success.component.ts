import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, EMPTY, exhaustMap, filter, startWith, Subject, switchMap } from 'rxjs';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import { EnumOrderStatus, type PaymentStateDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { PurchaseSyncService } from '@am-front/services/purchase-sync.service';
import { UserOrdersService } from '@am-front/services/user-orders.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Component({
    selector: 'amstore-auto-success',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './auto-success.component.html',
    styleUrl: './auto-success.component.scss',
    imports: [RouterLink, AmstoreButtonComponent, IconsComponent],
})
export class AutoSuccessComponent {
    private readonly orders = inject(UserOrdersService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly purchaseSync = inject(PurchaseSyncService);
    private readonly reload$ = new Subject<void>();

    public readonly orderId = signal<number | null>(null);
    public readonly state = signal<PaymentStateDto | null>(null);

    public readonly stateRequest = createRequestWrapper<typeof this.orders.getPaymentState>(
        this.orders.getPaymentState.bind(this.orders),
    );

    public readonly completed = computed(() => this.state()?.orderStatus === EnumOrderStatus.Success &&
        this.state()?.resolution === 'completed');

    /**
     * После перехода из mock-оплаты проверяет собственный заказ через API; URL не служит доказательством покупки.
     * Смена заказа или сессии отменяет подписку и очищает прежний результат, ошибки допускают ручную проверку.
     */
    constructor() {
        combineLatest([this.route.paramMap, toObservable(this.auth.auth), toObservable(this.auth.token)])
            .pipe(
                switchMap(([params, authenticated]) => {
                    const id = Number(params.get('id'));
                    const revision = this.auth.sessionRevision;

                    this.orderId.set(Number.isSafeInteger(id) && id > 0 ? id : null);
                    this.state.set(null);
                    this.stateRequest.clear();

                    if (!authenticated || this.orderId() === null) {
                        return EMPTY;
                    }

                    return this.reload$
                        .pipe(
                            startWith(undefined),
                            exhaustMap(() => this.stateRequest.request(id)),
                            filter((state) => this.auth.auth() && revision === this.auth.sessionRevision && state.orderId === id),
                        );
                }),
                takeUntilDestroyed(),
            )
            .subscribe((state) => {
                const wasCompleted = this.completed();

                this.state.set(state);

                if (this.completed() && !wasCompleted) {
                    this.purchaseSync.purchaseConfirmed();
                }
            });
    }

    /** Повторяет чтение серверного статуса после ошибки, не создавая новую платёжную попытку. */
    public check(): void {
        if (!this.auth.auth() || this.orderId() === null || this.stateRequest.loading()) {
            return;
        }

        this.reload$.next();
    }
}
