import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { LangType } from "@am-front/interface/lang.interface";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import {
    NumberEntityDto,
    PatternEntityDto,
    PatternSizeDto,
    SizeDto
} from '@am-front/root/api-v2';
import { OptionType } from "@am-front/interface/cdk.interface";
import { Currency, LangService } from '@am-front/services/lang.service';
import { CategoriesService } from "@am-front/services/categories.service";
import { CartItemModel, DEFAULT_CART_PRICE } from '@am-front/services/cart/order.misc';
import { SizesService } from '@am-front/services/sizes.service';
import { getPatternPrice } from '@ameralds/utils';
import { MatIcon } from '@angular/material/icon';


interface PatternCartStatus {
    sizes: SizeDto[];
    color: boolean;
}

@Component({
    selector: "amstore-pattern-preview-removed",
    templateUrl: "./pattern-removed-preview-actions.component.html",
    styleUrls: ["./pattern-removed-preview-actions.component.scss"],
    imports: [
        AmstoreChipComponent,
        MatIcon,
    ]
})
export class PatternRemovedPreviewActionsComponent {
    public pattern: InputSignal<PatternEntityDto> = input();
    public cart: InputSignal<CartItemModel> = input();

    private langService: LangService = inject(LangService)
    private categoriesService: CategoriesService = inject(CategoriesService);
    private sizesService: SizesService = inject(SizesService)

    public readonly lang: Signal<LangType> = this.langService.lang;
    public readonly categoriesById: Signal<Record<number, OptionType>> = this.categoriesService.categoriesById;
    public readonly categories: Signal<OptionType[]> = computed(() => {
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
        const cart: CartItemModel = this.cart();
        const sizes: SizeDto[] = this.sizesById();
        const sizesById: Record<number, SizeDto> = Object.fromEntries(
            sizes.map((size: SizeDto) => [size.id, size]),
        );

        return {
            sizes: pattern
                    .sizes
                    .filter((size: PatternSizeDto) => cart.sizes.includes(size.size))
                    .map((size: PatternSizeDto) => sizesById[size.size]),
            color: cart.color,
        }
    });

    public readonly price: Signal<NumberEntityDto> = computed(() => {
        const pattern: PatternEntityDto = this.pattern();
        const currentCart: CartItemModel = this.cart();

        if (!pattern || !currentCart) {
            return DEFAULT_CART_PRICE;
        }


        return getPatternPrice({
            ...currentCart,
            pattern,
        });
    });
}
