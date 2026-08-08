import { Component, computed, inject, input, InputSignal, output, OutputEmitterRef, Signal } from "@angular/core";
import type { PatternEntityDto, PatternSizeDto, SizeDto } from "@am-front/root/api-v2";
import { ICartPattern } from "@am-front/services/cart.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { SizesService } from "@am-front/services/sizes.service";
import { Currency, LangService, LangType } from "@am-front/services/lang.service";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";


interface PatternCartShowState {
    sizes: number[];
    color: boolean;
    price: number;
}

@Component({
    selector: "amstore-pattern-cart-short",
    imports: [
        AmstoreChipComponent,
        AmstoreButtonComponent
    ],
    templateUrl: "./pattern-cart-short.component.html",
    styleUrl: "./pattern-cart-short.component.scss",
    host: {
        class: "d-block p2",
    }
})
export class PatternCartShortComponent {
    public pattern: InputSignal<PatternEntityDto> = input();
    public cart: InputSignal<ICartPattern> = input();
    public inCart: InputSignal<boolean> = input(true);

    private sizesService: SizesService = inject(SizesService);
    private langService: LangService = inject(LangService);

    public returnToCart: OutputEmitterRef<void> = output();
    public removeFromCart: OutputEmitterRef<void> = output();
    public goToCard: OutputEmitterRef<void> = output();

    public sizesByIds: Signal<Record<number, SizeDto>> = toSignal(this.sizesService.byIds$);
    public currency: Signal<Currency> = this.langService.currency;

    public viewState: Signal<PatternCartShowState> = computed(() => {
        const pattern: PatternEntityDto = this.pattern();
        const cart: ICartPattern = this.cart();
        const sizesByIds: Record<number, SizeDto> = this.sizesByIds();
        const lang: LangType = this.langService.lang();

        if (Object.keys(sizesByIds).length === 0) {
            return null;
        }

        return {
            sizes: cart.sizes
                .map((id: number) => pattern.sizes.find((size: PatternSizeDto) => size.id === id))
                .map((size: PatternSizeDto) => sizesByIds[size.size]?.value),
            color: cart.color,
            price: cart.price[lang],
        };
    });
}
