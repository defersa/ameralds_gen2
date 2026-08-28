import { WritableSignal } from '@angular/core';
import { CartItemModel } from '@am-front/services/cart/order.misc';
import { NumberEntityDto } from '@am-front/root/api-v2';


export abstract class AbstractCartService {
    public abstract readonly cart: WritableSignal<CartItemModel[]>;
    public abstract readonly price: WritableSignal<NumberEntityDto>;

    public abstract addProduct(item: CartItemModel): void;
    public abstract removeProduct(id: number): void;
    public abstract clearCart(): void;
}
