import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, Signal, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe, Location } from "@angular/common";
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { getPatternPrice } from '@ameralds/utils';
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { AdminOrderDetailsDto } from '@am-front/root/api-v2';
import { AdminOrdersService } from '@am-front/services/admin-orders.service';
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { convertOrderPatternEntityToCartItem } from '@am-front/services/cart/order.misc';
import { SnackService } from '@am-front/services/snackbar.service';
import { Currency, LangService } from '@am-front/services/lang.service';
import { AmstorePatternCardComponent } from '@am-front/shared/card/pattern/pattern.component';
import { PatternAdminDownloadComponent } from '@am-front/shared/details/pattern-admin-download/pattern-admin-download.component';
import { loadingHandler } from '@am-front/utils/loading-with';


@Component({
    selector: "amstore-card",
    templateUrl: "./card.component.html",
    styleUrls: ["./card.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AmstoreButtonComponent,
        AmstorePatternCardComponent,
        PatternAdminDownloadComponent,
        DatePipe,
        DecimalPipe,
    ]
})
export class CardComponent {
    private readonly location: Location = inject(Location);
    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly adminOrdersService: AdminOrdersService = inject(AdminOrdersService);
    private readonly cartService: MajorCartService = inject(MajorCartService);
    private readonly snackService: SnackService = inject(SnackService);
    private readonly langService: LangService = inject(LangService);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    public readonly adminOrder: WritableSignal<AdminOrderDetailsDto | null> = signal(null);
    public readonly loading: WritableSignal<boolean> = signal(false);
    public readonly loadFailed: WritableSignal<boolean> = signal(false);
    public readonly resending: WritableSignal<boolean> = signal(false);
    public readonly copying: WritableSignal<boolean> = signal(false);
    public readonly actionPending: Signal<boolean> = computed(() => this.resending() || this.copying());
    public readonly canCopyToCart: Signal<boolean> = computed(() => {
        const order = this.adminOrder();

        return !!order?.isComplete && order.patterns.every((item) =>
            !!item.pattern && !!item.sizes?.length && item.sizes.every((size) => !!size.size),
        );
    });
    public readonly currency: Signal<Currency> = this.langService.currency;
    public readonly orderPrice: Signal<number | null> = computed(() => {
        const order: AdminOrderDetailsDto = this.adminOrder();

        if (!order || order.patterns.some((item) => !item.pattern)) {
            return null;
        }

        const lang = this.langService.lang();

        return order.patterns.reduce((sum, item) => sum + getPatternPrice(item)[lang], 0);
    });

    constructor() {
        this.route.paramMap
            .pipe(
                map((params) => Number(params.get('id'))),
                distinctUntilChanged(),
                switchMap((id: number) => {
                    this.adminOrder.set(null);
                    this.loadFailed.set(false);

                    if (!Number.isSafeInteger(id) || id <= 0) {
                        this.loadFailed.set(true);

                        return of(null);
                    }

                    return this.adminOrdersService.getOrder(id)
                        .pipe(
                            loadingHandler(this.loading),
                            catchError(() => {
                                this.loadFailed.set(true);

                                return of(null);
                            }),
                        );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((order: AdminOrderDetailsDto | null) => this.adminOrder.set(order));
    }

    public getBack(): void {
        this.location.back();
    }

    public resendOrderEmail(): void {
        const order = this.adminOrder();

        if (!order?.isComplete || !order.email?.trim() || this.actionPending()) {
            return;
        }

        this.adminOrdersService.resendOrderEmail(order.id)
            .pipe(
                loadingHandler(this.resending),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => this.snackService.open('Письмо отправлено повторно'),
                error: () => this.snackService.warn('Не удалось отправить письмо. Попробуйте ещё раз'),
            });
    }

    public copyToCart(): void {
        const order = this.adminOrder();

        if (!this.canCopyToCart() || this.actionPending()) {
            return;
        }

        const products = order.patterns.map(convertOrderPatternEntityToCartItem);

        this.cartService.replaceCart(products)
            .pipe(
                loadingHandler(this.copying),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => this.snackService.open('Состав заказа скопирован в корзину'),
                error: () => this.snackService.warn('Не удалось скопировать заказ в корзину. Попробуйте ещё раз'),
            });
    }
}
