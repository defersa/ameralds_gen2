import { Injectable } from "@angular/core";
import { LocalStorage } from "@am/decorators/local.decorator";
import { BehaviorSubject, Observable } from "rxjs";
import { IAdminCart, IAdminOrder, IAdminOrderShort, IPatternPurchase } from "@am/interface/order.interface";
import { HttpClient } from "@angular/common/http";
import { UB } from "@am/utils/action-builder";
import { Params } from "@angular/router";
import { IItemResponse, IPaginatedResponse, IResultRequest } from "@am/interface/request.interface";
import { parseJsonWithDefault } from "@am/utils/common.utils";
import { map } from "rxjs/operators";


const ADMIN_ORDER_NAME: string = 'adminOrder';

@Injectable({
    providedIn: 'root'
})
export class AdminOrderService {
    @LocalStorage(ADMIN_ORDER_NAME)
    private order!: string;

    public get order$(): Observable<IAdminCart> {
        return this._order$.asObservable();
    }

    private _order$: BehaviorSubject<IAdminCart> = new BehaviorSubject(parseJsonWithDefault(this.order, {purchases: []}));

    constructor(
        private httpClient: HttpClient,
    ) {
        this._order$.subscribe((order: IAdminCart) => {
            this.order = JSON.stringify(order)

            if (!this.isNotValidOrder(order)) {
                this.clearOrder();
            }
        });
    }

    public addPattern(purchase: IPatternPurchase): void {
        const order: IAdminCart = this._order$.getValue();

        order.purchases = [
            ...order.purchases.filter((item: IPatternPurchase) => item.pattern !== purchase.pattern),
            purchase,
        ];

        this._order$.next(order);
    }

    public removePattern(pattern: number): void {
        const order: IAdminCart = this._order$.getValue();

        order.purchases = order.purchases.filter((item: IPatternPurchase) => item.pattern !== pattern);

        this._order$.next(order);
    }

    public clearOrder(): void {
        this._order$.next({
            purchases: [],
        });
    }

    public getOrders(params: Params): Observable<IPaginatedResponse<IAdminOrderShort>> {
        return this.httpClient.get<IPaginatedResponse<IAdminOrderShort>>(UB(['api', 'admin-order', 'paginated']), {params});
    }

    public getOrder(params: Params): Observable<IAdminOrder> {
        return this.httpClient.get<IItemResponse<IAdminOrder>>(UB(['api', 'admin-order']), {params})
            .pipe(map((result: IItemResponse<IAdminOrder>) => result.item));
    }

    public sendOrder(data: Params): Observable<IResultRequest> {
        return this.httpClient.post<IResultRequest>(UB(['api', 'admin-order']), data);
    }

    private isNotValidOrder(cart: IAdminCart): boolean {
        return cart && Array.isArray(cart.purchases);
    }
}
