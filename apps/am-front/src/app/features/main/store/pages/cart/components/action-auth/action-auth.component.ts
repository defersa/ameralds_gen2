import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { CheckoutService } from '@am-front/services/cart/checkout.service';
import { UserCartService } from '@am-front/services/cart/sources/user-cart.service';
import { AuthService } from '@am-front/services/auth.service';
import { LangService } from '@am-front/services/lang.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';
import { conflictLabels } from './conflict-labels';


@Component({
    selector: 'amstore-cart-action-auth',
    templateUrl: './action-auth.component.html',
    imports: [AmstoreButtonComponent, DatePipe, DecimalPipe],
})
export class ActionAuthComponent {
    private readonly checkout = inject(CheckoutService);
    private readonly cart = inject(UserCartService);
    private readonly auth = inject(AuthService);
    private readonly lang = inject(LangService);

    public readonly request = createRequestWrapper<typeof this.checkout.place>(this.checkout.place.bind(this.checkout));
    public readonly refresh = createRequestWrapper<typeof this.cart.refreshCart>(this.cart.refreshCart.bind(this.cart));
    public readonly attempt = this.checkout.attempt;
    public readonly result = this.checkout.result;
    public readonly conflicts = computed(() => conflictLabels(this.request.errors()));
    public readonly hasConflict = computed(() => {
        const error = this.request.errors();

        return error instanceof HttpErrorResponse && error.status === 409;
    });

    public readonly disabled = computed(() => !this.auth.auth() || this.request.loading() || this.refresh.loading() ||
        this.hasConflict() || (!this.attempt() && (!this.cart.checkoutSelection() || !this.cart.cart()?.length)));

    /** Отправляет исходную попытку повторно либо явно выбранную текущую корзину; повторный клик во время запроса игнорируется. */
    public place(): void {
        if (this.disabled()) {
            return;
        }

        const selection = this.cart.checkoutSelection();

        const input = this.attempt() ?? (selection ? {
            ...selection,
            currency: this.lang.lang() === 'ru' ? 'RUB' as const : 'USD' as const,
        } : null);

        if (!input) {
            return;
        }

        this.request.request(input).subscribe();
    }

    /** Явно обновляет и нормализует корзину; после успеха оформление снова требует отдельного нажатия. */
    public updateCart(): void {
        if (!this.auth.auth() || this.request.loading() || this.refresh.loading()) {
            return;
        }

        this.refresh.request().subscribe(() => {
            this.checkout.reset();
            this.request.clear();
        });
    }
}
