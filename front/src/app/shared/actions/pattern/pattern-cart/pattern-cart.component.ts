import { Component, computed, inject, input, InputSignal, signal, Signal, WritableSignal } from "@angular/core";
import { CartService, ICartPattern } from "@am/services/cart.service";
import {
    FullPatternEntityDto,
    type FullPatternSizeDto,
    NumberEntityDto,
    PatternEntityDto,
    ShortOrderPatternDto
} from "@am/root/api";
import { toSignal } from "@angular/core/rxjs-interop";
import { IdRecord } from "@am/interface/common.interface";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { DialogService } from "@am/core/dialog/dialog.service";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { AmstoreSlideComponent } from "@am/cdk/slide/slide.component";
import { AmstoreChipComponent } from "@am/cdk/chip/chip.component";


interface PatternSizeForm {
    sizeId: number;
    label: number;
    control: FormControl<boolean>;
}

interface PatternSizesCart {
    bought: number[];
    list: PatternSizeForm[];
    form: FormGroup;
}

interface PatternCartState {
    state: PatternButtonState;
    sizes: PatternSizesCart;
    color?: {
        bought: boolean;
        control: FormControl<boolean>;
    };
}

interface PatternCartEditForm {
    sizes: PatternSizeForm[];
    hasColor: boolean;
    own: boolean;
    form: {
        sizes: FormGroup;
        color: FormControl<boolean>;
    };
    buttonState: PatternButtonState;
}

export enum PatternButtonState {
    Bought = 1,
    Editing,
    Edit,
    ToCart,
}

@Component({
    selector: "app-pattern-cart",
    imports: [
        AmstoreButtonComponent,
        AmstoreCheckboxComponent,
        AmstoreSlideComponent,
        ReactiveFormsModule,
        AmstoreChipComponent
    ],
    templateUrl: "./pattern-cart.component.html",
    styleUrl: "./pattern-cart.component.scss"
})
export class PatternCartComponent {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly cartService: CartService = inject(CartService);

    public readonly ownPatterns: Signal<IdRecord<ShortOrderPatternDto>> = toSignal(this.cartService.ownPatterns$);
    public readonly cartPatterns: Signal<IdRecord<ICartPattern>> = toSignal(this.cartService.patternsCart$);
    public readonly patternCartStateType: typeof PatternButtonState = PatternButtonState;
    public readonly own: Signal<ShortOrderPatternDto> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const ownPatterns: IdRecord<ShortOrderPatternDto> = this.ownPatterns();

        return ownPatterns[pattern?.id];
    });

    public readonly cart: Signal<ICartPattern> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const cartPatterns: IdRecord<ICartPattern> = this.cartPatterns();

        return cartPatterns[pattern?.id];
    });

    public readonly form: Signal<FormGroup> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        console.log('??')

        const form: FormGroup = new FormGroup(
            Object.fromEntries(
                pattern.sizes.map((size: FullPatternSizeDto) => [size.id, new FormControl()]),
            ),
        );

        if (pattern.color) {
            form.addControl('color', new FormControl());
        }

        return form;
    });

    public readonly editing: WritableSignal<boolean> = signal(false);
    public readonly patternCartState: Signal<PatternCartState> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const own: ShortOrderPatternDto = this.own();
        const cart: ICartPattern = this.cart();
        const form: FormGroup = this.form();

        const bought: boolean = own?.sizes.length === pattern.sizes.length && (pattern.color ? own?.color : true);
        let state: PatternButtonState = PatternButtonState.ToCart;

        if (this.editing()) {
            state = PatternButtonState.Editing;
        } else if (bought) {
            state = PatternButtonState.Bought;
        } else if (cart) {
            state = PatternButtonState.Edit;
        }

        const cartState: PatternCartState = {
            state,
            sizes: this.getSizesState(pattern, own, cart),
        };

        if (pattern.color) {
            const control: FormControl = form.get('color') as FormControl;

            control.setValue(cart?.color);

            cartState.color = {
                bought: own?.color,
                control,
            };
        }

        PatternCartComponent.canEdit(state) ? form.enable() : form.disable();

        return cartState;
    });

    private getSizesState(
        pattern: FullPatternEntityDto,
        own: ShortOrderPatternDto,
        cart: ICartPattern,
    ): PatternSizesCart {
        const form: FormGroup = this.form();
        const bought: number[] = own?.sizes
            .map((id: number) => pattern.sizes.find((size: FullPatternSizeDto) => size.id === id))
            .filter(Boolean)
            .map((size: FullPatternSizeDto) => size.size.value) ?? [];

        const list: PatternSizeForm[] = pattern
            .sizes
            .filter((size: FullPatternSizeDto) => !(own?.sizes.includes(size.id)))
            .map((size: FullPatternSizeDto) => {
                const control: FormControl<boolean> = form.get(String(size.id)) as FormControl;

                control.setValue(cart?.sizes.includes(size.id));

                return {
                    control,
                    sizeId: size.id,
                    label: size.size.value
                };
            });

        return {
            bought,
            form,
            list,
        };
    }

    private static canEdit(state: PatternButtonState): boolean {
        return [PatternButtonState.Editing, PatternButtonState.ToCart].includes(state);
    }

    public toCart(): void {
        const pattern: PatternEntityDto = {
            ...this.pattern(),
            sizes: this.pattern().sizes.map((size: FullPatternSizeDto) => ({
                ...size,
                size: size.size.id,
            }))
        };

        const state: PatternCartState = this.patternCartState();
        this.editing.set(false);

        this.cartService.addPattern(
            {
                id: pattern.id,
                sizes: state.sizes.list
                    .filter((size: PatternSizeForm) => size.control.value)
                    .map((size: PatternSizeForm) => size.sizeId),
                pattern: Boolean(this.own()),
                color: state.color?.control.value,
            },
            pattern,
        );
    }

    public removeFromCart(): void {
        this.cartService.removePattern(this.pattern().id);
    }

    public change(): void {
        this.editing.set(true);
    }

    public cancel(): void {
        this.editing.set(false);
    }
}
