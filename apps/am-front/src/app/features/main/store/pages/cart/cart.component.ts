import {
    Component,
    computed,
    DestroyRef,
    effect,
    EffectRef,
    inject,
    signal,
    Signal,
    WritableSignal
} from '@angular/core';
import { PatternsService } from "@am-front/services/patterns.service";
import { IdRecord } from "@am-front/interface/common.interface";
import { NumberEntityDto, PatternEntityDto } from '@am-front/root/api-v2';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MatDialogActions } from '@angular/material/dialog';
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
        MatDialogActions,
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
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    public readonly auth: Signal<boolean> = this.authService.auth;
    public readonly isAdmin: Signal<boolean> = this.profileService.isAdmin;
    public readonly currency: Signal<Currency> = this.langService.currency;

    public removed: WritableSignal<CartItem[]> = signal([]);
    public items: Signal<CartItem[]> = computed(() => {
        const patterns: IdRecord<PatternEntityDto> = this.initPatterns();
        const cart: CartItemModel[] = this.cartService.cart();

        if (!patterns) {
            return null;
        }

        return cart
            .map((cart: CartItemModel) =>  ({
                cart,
                pattern: patterns[cart.pattern],
            }));
    });

    public readonly cartCount: Signal<number> = computed(() => this.cartService.cart()?.length ?? 0);
    public readonly cartPrice: Signal<NumberEntityDto> = this.cartService.price;

    private initPatterns: WritableSignal<IdRecord<PatternEntityDto>> = signal(null);

    constructor() {
        const effectRef: EffectRef = effect(() => {
            const cart: CartItemModel[] = this.cartService.cart();

            if (!cart) {
                return;
            }

            this.getInitPatterns(cart);
            effectRef.destroy();
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

    private getInitPatterns(cart: CartItemModel[]): void {
        this.patternService.getPatternsByIds(cart.map((pattern: CartItemModel) => pattern.pattern))
            .pipe(
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((patterns: Record<string, PatternEntityDto>) => this.initPatterns.set(patterns));
    }
}
