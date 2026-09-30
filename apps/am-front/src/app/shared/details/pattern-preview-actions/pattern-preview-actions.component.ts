import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { LangType } from "@am-front/interface/lang.interface";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import {
    NumberEntityDto,
    PatternEntityDto,
    PatternSizeDto,
    SizeDto
} from '@am-front/root/api-v2';
import { toSignal } from "@angular/core/rxjs-interop";
import { OptionType } from "@am-front/interface/cdk.interface";
import { Currency, LangService, SizeUnit } from '@am-front/services/lang.service';
import { CategoriesService } from "@am-front/services/categories.service";
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { CartItemModel, DEFAULT_CART_PRICE } from '@am-front/services/cart/order.misc';
import { SizesService } from '@am-front/services/sizes.service';
import { getPatternPrice } from '@ameralds/utils';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';


interface PatternCartStatus {
    sizes: {
        own: SizeDto[];
        cart: SizeDto[];
        available: SizeDto[];
    };
    color: 'own' | 'cart' | 'available' | null;
}

const DEFAULT_CART_STATUS: PatternCartStatus = {
    sizes: {
        own: [],
        cart: [],
        available: [],
    },
    color: null,
};

@Component({
    selector: "amstore-pattern-preview",
    templateUrl: "./pattern-preview-actions.component.html",
    styleUrls: ["./pattern-preview-actions.component.scss"],
    imports: [
        AmstoreChipComponent,
        AmstoreButtonComponent,
        MatIcon,
        MatTooltip,
        RouterLink
    ]
})
export class PatternPreviewActionsComponent {
    public pattern: InputSignal<PatternEntityDto> = input();
    public routerLink: InputSignal<(string | number)[]> = input();

    private langService: LangService = inject(LangService)
    private categoriesService: CategoriesService = inject(CategoriesService);
    private sizesService: SizesService = inject(SizesService)
    private cartService: MajorCartService = inject(MajorCartService);

    public readonly lang: Signal<LangType> = this.langService.lang;
    public readonly sizeUnit: Signal<SizeUnit> = this.langService.sizeUnit;
    public categoriesById: Signal<Record<number, OptionType>> = this.categoriesService.categoriesById;
    public categories: Signal<OptionType[]> = computed(() => {
        const categoriesById: Record<number, OptionType> = this.categoriesById();
        const pattern: PatternEntityDto = this.pattern();

        return pattern.categories
            .map((category: number) => categoriesById[category])
            .filter(Boolean);
    });

    public readonly currency: Signal<Currency> = this.langService.currency;
    public readonly sizesById: Signal<SizeDto[]> = this.sizesService.sizes;
    public readonly cartStatus: Signal<PatternCartStatus> = computed(() => {
        const pattern: PatternEntityDto = this.pattern();
        const cart: CartItemModel = this.cartService.cartById()[pattern.id] || { sizes: [] } as CartItemModel;
        const own: CartItemModel = this.cartService.boughtPatterns()[pattern.id] || { sizes: [] } as CartItemModel;
        const sizes: SizeDto[] = this.sizesById();
        const unavailableSize: number[] = [...cart.sizes, ...own.sizes];
        const sizesById: Record<number, SizeDto> = Object.fromEntries(
            sizes.map((size: SizeDto) => [size.id, size]),
        );

        if (sizes.length === 0) {
            return DEFAULT_CART_STATUS;
        }

        return {
            sizes: {
                own: pattern
                    .sizes
                    .filter((size: PatternSizeDto) => own.sizes.includes(size.size))
                    .map((size: PatternSizeDto) => sizesById[size.size]),
                cart: pattern
                    .sizes
                    .filter((size: PatternSizeDto) => cart.sizes.includes(size.size))
                    .map((size: PatternSizeDto) => sizesById[size.size]),
                available: pattern
                    .sizes
                    .filter((size: PatternSizeDto) => !unavailableSize.includes(size.size))
                    .map((size: PatternSizeDto) => sizesById[size.size]),
            },
            color: pattern.color ? own.color ? 'own' : cart.color ? 'cart' : 'available' : null,
        }
    });

    public readonly sizesTooltip: Signal<string> = computed(() => [
        'Размеры. На текущий момент:',
        `Куплены: ${ this.prepareSizeToDisplay(this.cartStatus().sizes.own, this.sizeUnit()) };`,
        `В корзине: ${ this.prepareSizeToDisplay(this.cartStatus().sizes.cart, this.sizeUnit()) };`,
        `Доступно для покупки: ${ this.prepareSizeToDisplay(this.cartStatus().sizes.available, this.sizeUnit()) };`,
    ].join('\n'));

    public readonly inCart: Signal<boolean> = computed(() => Boolean(this.cartService.cartById()[this.pattern().id]));
    public readonly price: Signal<NumberEntityDto> = computed(() => {
        const pattern: PatternEntityDto = this.pattern();
        const currentCart: CartItemModel = this.cartService.cartById()[pattern.id];

        if (!pattern || !currentCart) {
            return DEFAULT_CART_PRICE;
        }


        return getPatternPrice({
            ...currentCart,
            pattern,
        });
    });

    private prepareSizeToDisplay(sizes: SizeDto[], sizeUnit: SizeUnit): string {
        if (sizes.length === 0) {
            return 'Пусто';
        }

        return sizes.map((size: SizeDto)=> `${size.value} ${sizeUnit}`).join(', ')
    }
}
