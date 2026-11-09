import { effect, inject, Injectable, signal, untracked, WritableSignal } from '@angular/core';
import {
    NumberEntityDto,
    ApiOrdersProducer,
    CartDto,
    CheckoutInputDto,
} from '@am-front/root/api-v2';
import {
    CartItemModel,
    convertOrderPatternEntityToCartItem,
    DEFAULT_CART_PRICE
} from '@am-front/services/cart/order.misc';
import { AuthService } from '@am-front/services/auth.service';
import { AbstractCartService } from '@am-front/services/cart/sources/abstract-cart.service';
import { defer, EMPTY, map, Observable, tap } from 'rxjs';
import { SnackService } from '@am-front/services/snackbar.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


@Injectable({
    providedIn: "root"
})
export class UserCartService extends AbstractCartService {
    private authService: AuthService = inject(AuthService);
    private orderProducer: ApiOrdersProducer = inject(ApiOrdersProducer);

    public readonly checkoutSelection = signal<Pick<CheckoutInputDto, 'cartId' | 'cartRevision'> | null>(null);

    public readonly cart: WritableSignal<CartItemModel[]> = signal(null);
    public readonly price: WritableSignal<NumberEntityDto> = signal(null);

    private readonly snack = inject(SnackService);
    private readonly loadRequest = createRequestWrapper(this.orderProducer.ordersControllerCart.bind(this.orderProducer));
    private readonly removeRequest = createRequestWrapper(this.orderProducer.ordersControllerRemoveItemFromCart.bind(this.orderProducer));
    private readonly mergeRequest = createRequestWrapper(this.orderProducer.ordersControllerMergeLocalCart.bind(this.orderProducer));

    /** Загружает корзину после входа и очищает состояние при выходе; сообщает об ошибках синхронизации. */
    constructor() {
        super();

        effect(() => {
            if (!this.authService.auth()) {
                this.cart.set(null);
                this.checkoutSelection.set(null);
                this.price.set(DEFAULT_CART_PRICE);

                return;
            }

            untracked(() => this.getActualCart());
        });

        effect(() => {
            if (this.loadRequest.errors() || this.removeRequest.errors() || this.mergeRequest.errors()) {
                this.snack.warn('Не удалось обновить корзину. Попробуйте ещё раз.');
            }
        });
    }

    /** Загружает актуальную нормализованную корзину авторизованного пользователя. */
    public getActualCart(): void {
        if (!this.authService.auth() || this.loadRequest.loading()) {
            return;
        }

        this.price.set(null);

        this.loadRequest.request()
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    /** Получает серверный состав для явного подтверждения после конфликта или перехода к новой корзине. */
    public refreshCart(): Observable<CartDto> {
        return defer(() => this.authService.auth()
            ? this.orderProducer.ordersControllerCart()
                .pipe(tap((cart) => this.updateCartAndPrice(cart)))
            : EMPTY);
    }

    /** Отправляет выбор на сервер и принимает нормализованную корзину; без входа запрос не выполняется. */
    public addProduct(pattern: CartItemModel): Observable<void> {
        if (!this.authService.auth()) {
            return EMPTY;
        }

        return this.orderProducer.ordersControllerAddItemToCart(pattern)
            .pipe(
                tap((order: CartDto) => this.updateCartAndPrice(order)),
                map(() => undefined),
            );
    }

    /** Удаляет схему из личной корзины, блокируя повторный запрос до завершения предыдущего. */
    public removeProduct(id: number): void {
        if (!this.authService.auth() || this.removeRequest.loading()) {
            return;
        }

        this.removeRequest.request(id)
            .subscribe((order: CartDto) => this.updateCartAndPrice(order));
    }

    /** Очищает серверную корзину авторизованного пользователя и принимает новый состав. */
    public clearCart(): Observable<void> {
        if (!this.authService.auth()) {
            return EMPTY;
        }

        return this.orderProducer.ordersControllerClearAll()
            .pipe(
                tap((order: CartDto) => this.updateCartAndPrice(order)),
                map(() => undefined),
            );
    }

    /** Сливает локальный выбор с личной корзиной; успешный ответ содержит только новые права. */
    public mergeLocalCart(patterns: CartItemModel[]): Observable<void> {
        if (!this.authService.auth() || this.mergeRequest.loading()) {
            return EMPTY;
        }

        return this.mergeRequest.request(patterns)
            .pipe(
                tap((order: CartDto) => this.updateCartAndPrice(order)),
                map(() => undefined),
            );
    }

    /** Принимает серверный состав и сообщает об исключённых покупках, в том числе полностью купленных. */
    private updateCartAndPrice(cart: CartDto): void {
        if (cart.correctedPatternIds?.length) {
            this.snack.open('Корзина обновлена: уже купленные размеры и цвет, а также недоступные варианты исключены. Полностью купленные позиции удалены.');
        }

        this.checkoutSelection.set({
            cartId: cart.cart.id,
            cartRevision: cart.revision,
        });
        this.price.set(cart.price);
        this.cart.set(
            cart.cart.patterns
                .map(convertOrderPatternEntityToCartItem),
        );
    }
}
