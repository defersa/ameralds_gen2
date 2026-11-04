import {
    Component,
    computed,
    effect,
    inject,
    signal,
    Signal,
    WritableSignal
} from '@angular/core';
import { Subscription } from 'rxjs';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';
import { PatternsService } from "@am-front/services/patterns.service";
import { IdRecord } from "@am-front/interface/common.interface";
import { NumberEntityDto, PatternEntityDto } from '@am-front/root/api-v2';
import { Router } from "@angular/router";
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { CartItemModel } from '@am-front/services/cart/order.misc';
import { AmstoreSnapshotPatternComponent } from '@am-front/shared/snapshot/pattern/pattern.component';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';

import { ActionAdminComponent } from './components/action-admin/action-admin.component';
import { ActionAuthComponent } from './components/action-auth/action-auth.component';
import { ActionNoAuthComponent } from './components/action-no-auth/action-no-auth.component';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { Currency, LangService } from '@am-front/services/lang.service';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import {
    PatternPreviewActionsComponent
} from '@am-front/shared/details/pattern-preview-actions/pattern-preview-actions.component';
import {
    PatternRemovedPreviewActionsComponent
} from '@am-front/shared/details/pattern-removed-preview-actions/pattern-removed-preview-actions.component';


interface CartItem {
    pattern: PatternEntityDto;
    cart: CartItemModel;
}

@Component({
    selector: "amstore-cart",
    templateUrl: "./cart.component.html",
    styleUrls: ["./cart.component.scss"],
    standalone: true,
    imports: [
        ActionAdminComponent,
        ActionAuthComponent,
        ActionNoAuthComponent,
        AmstoreSnapshotPatternComponent,
        MatIcon,
        DecimalPipe,
        AmstoreButtonComponent,
        PatternPreviewActionsComponent,
        PatternRemovedPreviewActionsComponent
    ]
})
export class CartComponent {
    private readonly cartService: MajorCartService = inject(MajorCartService);
    private readonly authService: AuthService = inject(AuthService);
    private readonly profileService: ProfileService = inject(ProfileService);
    private readonly patternService: PatternsService = inject(PatternsService);
    private readonly router: Router = inject(Router);
    private readonly langService: LangService = inject(LangService);

    public readonly auth: Signal<boolean> = this.authService.auth;
    public readonly isAdmin: Signal<boolean> = this.profileService.isAdmin;
    public readonly currency: Signal<Currency> = this.langService.currency;

    public readonly patternsRequest = createRequestWrapper(this.patternService.getPatternsByIds.bind(this.patternService));

    public removed: WritableSignal<CartItem[]> = signal([]);
    public items: Signal<CartItem[]> = computed(() => {
        const patterns: IdRecord<PatternEntityDto> = this.initPatterns();
        const cart: CartItemModel[] = this.cartService.cart();

        if (!patterns || !cart) {
            return null;
        }

        return cart
            .filter((item) => Boolean(patterns[item.pattern]))
            .map((cart: CartItemModel) =>  ({
                cart,
                pattern: patterns[cart.pattern],
            }));
    });

    public readonly cartCount: Signal<number> = computed(() => this.cartService.cart()?.length ?? 0);
    public readonly cartPrice: Signal<NumberEntityDto> = this.cartService.price;

    private initPatterns: WritableSignal<IdRecord<PatternEntityDto>> = signal(null);

    /** Перезагружает карточки при нормализации и merge, отменяя загрузку предыдущего состава. */
    constructor() {
        effect((onCleanup) => {
            const cart: CartItemModel[] = this.cartService.cart();

            if (!cart) {
                return;
            }

            const subscription = this.getInitPatterns(cart);

            onCleanup(() => subscription.unsubscribe());
        });
    }

    public removeFromCart({ cart, pattern }: CartItem): void {
        this.removed.set(
            [...this.removed(), { cart, pattern }],
        );

        this.cartService.removeProduct(pattern.id);
    }

    public returnToCart({ cart, pattern }: CartItem): void {
        this.removed.set(
            this.removed().filter((item: CartItem) => item.pattern.id !== pattern.id),
        );

        this.cartService.addProduct(cart);
    }

    public clearCart(): void {
        this.removed.set([
            ...this.removed(),
            ...this.items(),
        ]);

        this.cartService.clearCart();
    }

    /** Загружает карточки актуального состава; подписка отменяется при следующем изменении корзины. */
    private getInitPatterns(cart: CartItemModel[]): Subscription {
        return this.patternsRequest.request(cart
            .map((pattern) => pattern.pattern))
            .subscribe((patterns: Record<string, PatternEntityDto>) => this.initPatterns.set(patterns));
    }
}
