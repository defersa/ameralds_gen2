import { Component, computed, inject, input, InputSignal, Signal } from "@angular/core";
import type { PatternEntityDto, PatternSizeDto, SizeDto } from "@am/root/api";
import { ICartPattern } from "@am/services/cart.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { SizesService } from "@am/services/sizes.service";
import { Currency, LangService, LangType } from "@am/services/lang.service";
import { AmstoreChipComponent } from "@am/cdk/chip/chip.component";


interface PatternCartShowState {
    sizes: number[];
    color: boolean;
    price: number;
}

@Component({
    selector: "amstore-pattern-cart-short",
    imports: [
        AmstoreChipComponent,
    ],
    templateUrl: "./pattern-cart-short.component.html",
    styleUrl: "./pattern-cart-short.component.scss",
})
export class PatternCartShortComponent {
    public pattern: InputSignal<PatternEntityDto> = input();
    public cart: InputSignal<ICartPattern> = input();

    private sizesService: SizesService = inject(SizesService);
    private langService: LangService = inject(LangService);

    public sizesByIds: Signal<Record<number, SizeDto>> = toSignal(this.sizesService.byIds$);
    public currency: Signal<Currency> = this.langService.currency;

    public viewState: Signal<PatternCartShowState> = computed(() => {
        const pattern: PatternEntityDto = this.pattern();
        const cart: ICartPattern = this.cart();
        const sizesByIds: Record<number, SizeDto> = this.sizesByIds();
        const lang: LangType = this.langService.lang();

        console.log(cart.sizes
            .map((id: number) => pattern.sizes.find((size: PatternSizeDto) => size.id === id)));

        return {
            sizes: cart.sizes
                .map((id: number) => pattern.sizes.find((size: PatternSizeDto) => size.id === id))
                .map((size: PatternSizeDto) => sizesByIds[size.size].value),
            color: cart.color,
            price: cart.price[lang],
        };
    })
}
