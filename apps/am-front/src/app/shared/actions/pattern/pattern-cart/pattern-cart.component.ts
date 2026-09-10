import {
    Component,
    computed,
    effect,
    inject,
    input,
    InputSignal,
    signal,
    Signal,
    WritableSignal
} from '@angular/core';
import {
    FullPatternEntityDto, FullPatternSizeDto,
    NumberEntityDto
} from '@am-front/root/api-v2';
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { FormField } from "@angular/forms/signals";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import { LangNumberComponent } from "@am-front/shared/lang-text/lang-number.component";
import { Currency, LangService } from "@am-front/services/lang.service";
import {
    PatternCartFormField,
    PatternCartService
} from "@am-front/shared/actions/pattern/pattern-cart/pattern-cart.service";
import { MajorCartService } from '@am-front/services/cart/major-cart.service';
import { CartItemModel } from '@am-front/services/cart/order.misc';
import { AmstoreCheckboxSignalComponent, AmstoreSlideSignalComponent } from '@am-front/cdk/signal-forms';


export enum PatternButtonState {
    Bought = 1,
    Editing,
    ToEdit,
    ToCart,
}

@Component({
    selector: "amstore-pattern-cart",
    imports: [
        AmstoreButtonComponent,
        AmstoreCheckboxSignalComponent,
        FormField,
        AmstoreChipComponent,
        LangNumberComponent,
        AmstoreSlideSignalComponent
    ],
    providers: [PatternCartService],
    templateUrl: "./pattern-cart.component.html",
    styleUrl: "./pattern-cart.component.scss",
})
export class PatternCartComponent {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly cartService: MajorCartService = inject(MajorCartService);
    private readonly langService: LangService = inject(LangService);
    private readonly patternCartService: PatternCartService = inject(PatternCartService);

    public readonly patternCartStateType: typeof PatternButtonState = PatternButtonState;
    public readonly editing: WritableSignal<boolean> = signal(false);
    public readonly price: Signal<NumberEntityDto> = this.patternCartService.price;
    public readonly currency: Signal<Currency> = this.langService.currency;
    public readonly form: PatternCartFormField = this.patternCartService.form;
    public readonly currentCart: Signal<CartItemModel | null> = this.patternCartService.currentCart;

    public readonly patternCartButton: Signal<PatternButtonState> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();

        if (!pattern) {
            return null;
        }

        const cart: CartItemModel = this.cartService.cartById()[pattern.id];
        const own: CartItemModel = this.cartService.boughtPatterns()[pattern.id];
        const boughtSizes: number[] = own?.sizes || [];
        const boughtColor: boolean = pattern.color ? own?.color : true;
        const bought: boolean = pattern.sizes
            .every((size: FullPatternSizeDto) => boughtSizes.includes(size.size.id)) && boughtColor;

        if (cart && this.editing()) {
            return PatternButtonState.Editing;
        } else if (bought) {
            return PatternButtonState.Bought;
        } else if (cart) {
            return PatternButtonState.ToEdit;
        }

        return PatternButtonState.ToCart;
    });

    constructor() {
        effect(() => {
            const pattern: FullPatternEntityDto = this.pattern();
            const cart: CartItemModel = this.cartService.cartById()[pattern.id];
            const bought: CartItemModel = this.cartService.boughtPatterns()[pattern.id];
            const enabled: boolean = [PatternButtonState.ToCart, PatternButtonState.Editing].includes(this.patternCartButton());

            this.editing();

            this.patternCartService.updateFormValue(pattern, cart, bought, enabled);
        });
    }

    public toCart(): void {
        const cart: CartItemModel = this.patternCartService.currentCart();

        if (!cart) {
            return;
        }

        this.cartService.addProduct(cart);
        this.editing.set(false);
    }

    public removeFromCart(): void {
        this.cartService.removeProduct(this.pattern().id);
        this.editing.set(true);
    }

    public change(): void {
        this.editing.set(true);
    }

    public cancel(): void {
        this.editing.set(false);
    }
}
