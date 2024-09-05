import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LocalStorageService } from '../core/services/local-storage.service';
import { getAction, HttpActions } from '../utils/action-builder';
import { GoodsCard, ProductLite, ProductType, GoodsModifire, GoodsStatusResult } from '../interface/goods.intreface';
import { IPattern } from '../interface/pattern.interface';


const LOCAL_GOODS_NAME: string = 'localGoods';

@Injectable({
    providedIn: 'root'
})
export class GoodsService {

    public set goods(value: GoodsCard) {
        if (!value) {
            return;
        }

        this.goods$.next(value);
    }

    public get goods(): GoodsCard {
        return this.goods$.getValue();
    }

    public goods$: BehaviorSubject<GoodsCard>;

    public goodsCount: Subject<number> = new Subject<number>();
    public goodsPrice: Subject<number> = new Subject<number>();

    public get localGoods(): GoodsCard {
        const local: string = this.localStorage.getVariable(LOCAL_GOODS_NAME) as string;
        return local ? JSON.parse(local) : {
            id: 0,
            jewels: [],
            patterns: []
        };
    }

    public set localGoods(value: GoodsCard) {
        this.localStorage.setVariable(LOCAL_GOODS_NAME, JSON.stringify(value));
    }

    constructor(
        private localStorage: LocalStorageService,
        private authService: AuthService,
        private httpClient: HttpClient
    ) {
        this.goods$ = new BehaviorSubject<GoodsCard>(this.localGoods);

        this.goods$.subscribe((goods: GoodsCard) => {
            this.goodsCount.next(goods.jewels.length + goods.patterns.length);

            // this.goodsPrice.next(goods.jewels.reduce((acc: number, item: ProductLite) => acc + item[PriceLocation.EN], 0)
            //     + goods.patterns.reduce((acc: number, item: ProductLite) => acc + item[PriceLocation.EN], 0));
        })
    }

    public addProduct(type: ProductType, product: ProductLite | IPattern): Observable<any> {
        if (this.authService.authStatus$.value) {
            return this.httpClient
                .post<GoodsModifire>(getAction(HttpActions.AddProduct), { id: product.id, productType: type })
                .pipe( tap((request: GoodsModifire) => this.goods = request.goods));
        }
        const value: GoodsCard = this.localGoods;
        ProductType.Patterns === type ? value.patterns.push(product as IPattern) : value.jewels.push(product as ProductLite);
        this.goods$.next(value);

        return of({
            result: true,
            goods: value
        });
    }
    public removeProduct(type: ProductType, id: number): Observable<any> {
        if (this.authService.authStatus$.value) {
            return this.httpClient
                .post<GoodsModifire>(getAction(HttpActions.RemoveProduct), { id: id, productType: type })
                .pipe( tap((request: GoodsModifire) => this.goods = request.goods));
        }

        const value: GoodsCard = this.localGoods;
        if(ProductType.Patterns === type){
            value.patterns = value[type].filter((value: IPattern) => value.id !== id );
        }
        if(ProductType.Jewels === type){
            value.jewels = value[type].filter((value: ProductLite) => value.id !== id );
        }
        this.goods$.next(value);

        return of({
            result: true,
            goods: value
        });
    }

    public buyGoods(): Observable<GoodsStatusResult> {
        return this.httpClient.post<GoodsStatusResult>(getAction(HttpActions.GoodsBuy), {}).pipe();
    }

}
