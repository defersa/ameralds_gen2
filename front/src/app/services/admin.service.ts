import { Injectable } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { CartPattern, } from "@am/interface/cart.interface";
import { LocalStorageService } from "@am/core/services/local-storage.service";

const ADMIN_CART_NAME: string = 'adminCart';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    public cart$: BehaviorSubject<CartPattern[]>;

    public get card(): CartPattern[] {
        return this.cart$.getValue();
    }

    constructor(
        private _localStorageService: LocalStorageService
    ) {
        const adminCart: CartPattern[] = JSON.parse(String(this._localStorageService.getVariable(ADMIN_CART_NAME)));
        this.cart$ = new BehaviorSubject<CartPattern[]>(adminCart || []);

        this.cart$.subscribe((cart: CartPattern[]) => this._localStorageService.setVariable(ADMIN_CART_NAME, JSON.stringify(cart)));
    }

    public addPatterToCart(pattern: CartPattern): void {
        const patterns: CartPattern[] = this.card.filter((item: CartPattern) => pattern.id !== item.id);
        patterns.push(pattern);
        this.cart$.next(patterns);
    }

    public removePatterToCart(id: number): void {
        this.cart$.next(this.card.filter((item: CartPattern) => id !== item.id));
    }
}
