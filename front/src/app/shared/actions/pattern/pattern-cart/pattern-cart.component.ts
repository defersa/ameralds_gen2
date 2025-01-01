import { Component, computed, inject, Injector, input, InputSignal, OnInit, Signal } from "@angular/core";
import { IdName } from "@am/interface/request.interface";
import { CategoryType } from "@am/interface/category.interface";
import { IPattern } from "@am/interface/pattern.interface";
import { expandAnimation } from "@am/cdk/animations/expand";
import { GoodsCard, GoodsModifire, ProductType } from "@am/interface/goods.intreface";
import { ThemePalette } from "@am/cdk/core/color";
import { CartService } from "@am/services/cart.service";
import { combineLatest } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ProfileService } from "@am/services/profile.service";
import { AbstractPatternCard } from "@am/shared/actions/pattern/pattern.abstract";
import { toSignal } from "@angular/core/rxjs-interop";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { AmstoreSlideComponent } from "@am/cdk/slide/slide.component";
import { AmstoreInfoComponent } from "@am/cdk/info/info.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { NgClass } from "@angular/common";
import { LangService } from "@am/services/lang.service";

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
    private cartService: CartService = inject(CartService);
    private profileService: ProfileService = inject(ProfileService);

    public categories: Signal<IdName[]> = computed(() => {
        const pattern: IPattern = this.pattern();
        const lang: 'en' | 'ru' = toSignal(this.langService.lang$)();

        return pattern.category.map((item: CategoryType) => ({id: item.id, name: item.name[lang]}));
    });

    public price: Signal<string> = computed(() => {
        const pattern: IPattern = this.pattern();
        const lang: 'en' | 'ru' = toSignal(this.langService.lang$)();

        return pattern.price[lang];
    });

    public status: Signal<'buy' | 'remove' | 'bought'> = computed(() => {
        // const goods: GoodsCard = toSignal(this.cartService)();
        const bought: number[] = toSignal(this.profileService.boughtPatterns$)();
        const pattern: IPattern = this.pattern();

        // if (goods.patterns.find((value: IPattern) => value.id === pattern.id)) {
        //     return 'remove';
        // } else  if (bought.find((value: number) => value === pattern.id)) {
        //     return 'bought';
        // }

        return 'buy';
    });

    public readonly currency: Signal<string> = this.langService.currency;
    public form: FormGroup;
    public showSale: boolean = false;

    constructor() {
        super();

        this.form = new FormGroup({
            sizes: new FormControl<number[]>([]),
            color: new FormControl<boolean>(false),
        });
    }

    public buttonStatus: Record<string, ButtonStatusMap> = {
        buy: {
            label: 'Купить',
            action: () => {
                // this.goodsService.addProduct(
                //     ProductType.Patterns, this.pattern())
                //     .subscribe((result: GoodsModifire) => {
                //     });
            },
            color: 'primary'
        },
        remove: {
            label: 'Удалить из корзины',
            action: () => {
                // this.goodsService.removeProduct(
                //     ProductType.Patterns, this.pattern().id)
                //     .subscribe((result: GoodsModifire) => {
                //     });
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
