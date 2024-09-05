import { Component, Injector, OnInit } from '@angular/core';
import { IdName } from "@am/interface/request.interface";
import { CategoryType } from "@am/interface/category.interface";
import { IPattern } from "@am/interface/pattern.interface";
import { expandAnimation } from "@am/cdk/animations/expand";
import { GoodsCard, GoodsModifire, ProductType } from "@am/interface/goods.intreface";
import { ThemePalette } from "@am/cdk/core/color";
import { GoodsService } from "@am/services/goods.service";
import { combineLatest } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ProfileService } from "@am/services/profile.service";
import { AbstractPatternCard } from "@am/shared/actions/pattern/pattern.abstract";

type ButtonStatusMap = {
    label: string;
    action: () => void;
    color: ThemePalette;
}


@Component({
    selector: 'app-pattern-cart',
    templateUrl: './pattern-cart.component.html',
    styleUrls: ['./pattern-cart.component.scss'],
    animations: [
        expandAnimation
    ],
})
export class PatternCartComponent extends AbstractPatternCard implements OnInit {

    public get categories(): IdName[] {
        return this.pattern.category.map((item: CategoryType) => ({id: item.id, name: item.name[this._lang]}))
    }

    public get price(): string {
        return this.pattern.price[this._lang] + (this._lang === 'en' ? '$' : '₽');
    }

    public get expandState(): 'collapsed' | 'expanded' {
        return this.showSale ? 'expanded' : 'collapsed';
    }

    public showSale: boolean = false;


    public status: 'buy' | 'remove' | 'bought' = 'buy';


    constructor(private goodsService: GoodsService,
                private profileService: ProfileService,
                private _injector: Injector) {
        super(_injector);
    }

    public ngOnInit(): void {
        combineLatest([
            this.goodsService.goods$,
            this.profileService.boughtPatterns$
        ]).pipe(takeUntil(this.destroyed))
            .subscribe(() => {
                this.status = 'buy';
                const goods: GoodsCard = this.goodsService.goods$.value;
                const bought: number[] = this.profileService.boughtPatterns$.value;

                if (goods.patterns.find((value: IPattern) => value.id === this.pattern.id)) {
                    this.status = 'remove';
                }
                if (bought.find((value: number) => value === this.pattern.id)) {
                    this.status = 'bought';
                }
            })
    }

    public buttonStatus: Record<string, ButtonStatusMap> = {
        buy: {
            label: 'Купить',
            action: () => {
                this.goodsService.addProduct(
                    ProductType.Patterns, this.pattern)
                    .subscribe((result: GoodsModifire) => {
                    });
            },
            color: 'primary'
        },
        remove: {
            label: 'Удалить из корзины',
            action: () => {
                this.goodsService.removeProduct(
                    ProductType.Patterns, this.pattern.id)
                    .subscribe((result: GoodsModifire) => {
                    });
            },
            color: 'warn'
        },
        bought: {
            label: 'Товар уже куплен',
            action: () => {
            },
            color: 'accent'
        }
    }
}
