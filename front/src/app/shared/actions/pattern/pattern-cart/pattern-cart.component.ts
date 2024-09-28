import { Component, computed, inject, Injector, input, InputSignal, OnInit, Signal } from "@angular/core";
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
import { toSignal } from "@angular/core/rxjs-interop";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { ReactiveFormsModule } from "@angular/forms";
import { AmstoreSlideComponent } from "@am/cdk/slide/slide.component";
import { AmstoreInfoComponent } from "@am/cdk/info/info.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { NgClass } from "@angular/common";

type ButtonStatusMap = {
    label: string;
    action: () => void;
    color: ThemePalette;
}


@Component({
    selector: "app-pattern-cart",
    templateUrl: "./pattern-cart.component.html",
    styleUrls: ["./pattern-cart.component.scss"],
    standalone: true,
    animations: [
        expandAnimation
    ],
    imports: [
        AmstoreCheckboxComponent,
        ReactiveFormsModule,
        AmstoreSlideComponent,
        AmstoreInfoComponent,
        AmstoreButtonComponent,
        IconsComponent,
        NgClass
    ]
})
export class PatternCartComponent extends AbstractPatternCard {
    public categories: Signal<IdName[]> = computed(() => {
        const pattern: IPattern = this.pattern();
        const lang: 'en' | 'ru' = toSignal(this.langService.lang$)();

        return pattern.category.map((item: CategoryType) => ({id: item.id, name: item.name[lang]}));
    });

    public price: Signal<string> = computed(() => {
        const pattern: IPattern = this.pattern();
        const lang: 'en' | 'ru' = toSignal(this.langService.lang$)();

        return pattern.price[lang] + (lang === 'en' ? '$' : '₽')
    });

    public status: Signal<'buy' | 'remove' | 'bought'> = computed(() => {
        const goods: GoodsCard = toSignal(this.goodsService.goods$)();
        const bought: number[] = toSignal(this.profileService.boughtPatterns$)();
        const pattern: IPattern = this.pattern();

        if (goods.patterns.find((value: IPattern) => value.id === pattern.id)) {
            return 'remove';
        } else  if (bought.find((value: number) => value === pattern.id)) {
            return 'bought';
        }

        return 'buy';
    });

    public get expandState(): 'collapsed' | 'expanded' {
        return this.showSale ? 'expanded' : 'collapsed';
    }

    public showSale: boolean = false;

    private goodsService: GoodsService = inject(GoodsService);
    private profileService: ProfileService = inject(ProfileService);

    public buttonStatus: Record<string, ButtonStatusMap> = {
        buy: {
            label: 'Купить',
            action: () => {
                this.goodsService.addProduct(
                    ProductType.Patterns, this.pattern())
                    .subscribe((result: GoodsModifire) => {
                    });
            },
            color: 'primary'
        },
        remove: {
            label: 'Удалить из корзины',
            action: () => {
                this.goodsService.removeProduct(
                    ProductType.Patterns, this.pattern().id)
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
