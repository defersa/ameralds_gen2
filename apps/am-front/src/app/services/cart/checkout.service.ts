import { HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { ApiOrdersProducer, CheckoutInputDto, CheckoutOrderDto } from '@am-front/root/api-v2';
import { UserCartService } from './sources/user-cart.service';
import { AuthService } from '@am-front/services/auth.service';
import { defer, map, Observable, switchMap, tap, throwError } from 'rxjs';


const ATTEMPT_KEY = 'amstore_checkout_attempt';

/** Читает сохранённую попытку без персональных данных; повреждённые значения и недоступное хранилище игнорирует. */
function restoreAttempt(): CheckoutInputDto | null {
    try {
        const value: unknown = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? 'null');

        if (value && typeof value === 'object' && 'cartId' in value && 'cartRevision' in value && 'currency' in value &&
            typeof value.cartId === 'number' && Number.isInteger(value.cartId) && value.cartId > 0 &&
            typeof value.cartRevision === 'string' && /^[a-f0-9]{64}$/.test(value.cartRevision) &&
            (value.currency === 'RUB' || value.currency === 'USD')) {
            return {
                cartId: value.cartId,
                cartRevision: value.cartRevision,
                currency: value.currency,
            };
        }
    } catch {
        return null;
    }

    return null;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
    private readonly api = inject(ApiOrdersProducer);
    private readonly auth = inject(AuthService);
    private readonly cart = inject(UserCartService);
    private readonly pendingAttempt = signal<CheckoutInputDto | null>(restoreAttempt());

    public readonly attempt = this.pendingAttempt.asReadonly();

    /** Очищает сохранённую попытку при выходе из аккаунта. */
    constructor() {
        effect(() => {
            if (!this.auth.auth()) {
                this.reset();
            }
        });
    }

    /**
     * Оформляет подтверждённый состав. До отправки сохраняет исходный cartId для повтора после потери ответа
     * или перезагрузки. После ответа обновляет серверную корзину и только затем возвращает заказ
     * для навигации; при ошибке обновления сохраняет попытку для безопасного повтора.
     */
    public place(input: CheckoutInputDto): Observable<CheckoutOrderDto> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            this.pendingAttempt.set(input);

            try {
                sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(input));
            } catch {
                // В приватном режиме повтор в текущей вкладке сохраняется в памяти сервиса.
            }

            return this.api.checkoutControllerPlace(input)
                .pipe(
                    switchMap((order) => this.cart.refreshCart()
                        .pipe(
                            tap(() => this.reset()),
                            map(() => order),
                        )),
                );
        });
    }

    /** Завершает попытку после успешного обновления корзины; следующая отправка потребует нового подтверждения. */
    public reset(): void {
        this.pendingAttempt.set(null);

        try {
            sessionStorage.removeItem(ATTEMPT_KEY);
        } catch {
            // Состояние текущей вкладки уже очищено.
        }
    }
}
