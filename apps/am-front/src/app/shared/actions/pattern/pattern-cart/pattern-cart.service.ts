import { computed, effect, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import {
    form,
    type FieldTree,
    type SchemaPathTree,
    disabled,
    applyEach,
    ChildFieldContext
} from '@angular/forms/signals';
import { FullPatternEntityDto, type FullPatternSizeDto, NumberEntityDto } from "@am-front/root/api-v2";
import { CartItemModel, DEFAULT_CART_PRICE } from '@am-front/services/cart/order.misc';
import { getPatternPrice } from '@ameralds/utils';


export interface PatternCartSizeForm {
    id: number;
    label: number;
    own: boolean;
    value: boolean;
}

export interface PatternCartForm {
    color: {
        exists: boolean;
        own: boolean;
        value: boolean;
    };
    base: {
        own: boolean;
        value: boolean;
    };
    sizes: PatternCartSizeForm[];
}

export type PatternCartFormField = FieldTree<PatternCartForm>;
export type PatternCartFormState = SchemaPathTree<PatternCartForm>;

@Injectable()
export class PatternCartService {
    private readonly currentPattern: WritableSignal<FullPatternEntityDto | null> = signal(null);
    private readonly formEnabled: WritableSignal<boolean> = signal(true);
    private readonly formValue: WritableSignal<PatternCartForm> = signal({
        color: {
            exists: false,
            own: false,
            value: false,
        },
        base: {
            own: false,
            value: false,
        },
        sizes: [],
    });

    public form: PatternCartFormField = form(this.formValue, (formState: PatternCartFormState) => {
        disabled(formState.color.value, {
            when: ({ valueOf }: ChildFieldContext<boolean>) =>
                !valueOf(formState.color.exists) ||
                valueOf(formState.color.own) ||
                (!valueOf(formState.base.own) && !valueOf(formState.base.value)),
        });

        disabled(formState, {
            when: () => !this.formEnabled(),
        })

        applyEach(formState.sizes, (size: SchemaPathTree<PatternCartSizeForm>) => {
            disabled(size.value, {
                when: ({ valueOf }: ChildFieldContext<boolean>) => valueOf(size.own),
            });
        });
    });

    public readonly currentCart: Signal<CartItemModel | null> = computed(() => {
        const formValue: PatternCartForm = this.formValue();
        const currentPattern: FullPatternEntityDto = this.currentPattern();

        if (!currentPattern) {
            return null;
        }

        const someChecked: boolean = formValue.sizes.filter((size: PatternCartSizeForm) => size.value).length > 0 || formValue.color.value;

        if (!someChecked) {
            return null;
        }

        return {
            pattern: currentPattern.id,
            requiresPatternPurchase: formValue.base.value,
            sizes: formValue.sizes
                .filter((size: PatternCartSizeForm) => size.value)
                .map((size: PatternCartSizeForm) => size.id),
            color: formValue.color.value,
        }
    })

    public readonly price: Signal<NumberEntityDto> = computed(() => {
        const currentCart: CartItemModel = this.currentCart();
        const currentPattern: FullPatternEntityDto = this.currentPattern();

        if (!currentPattern || !currentCart) {
            return DEFAULT_CART_PRICE;
        }


        return getPatternPrice({
            ...currentCart,
            pattern: currentPattern,
        });
    });

    constructor() {
        const requiredToBuy: Signal<boolean> = computed(() => {
            const values: PatternCartForm = this.formValue();

            return !values.base.own && values.sizes.some((size: PatternCartSizeForm) => size.value);
        })

        effect(() => {
            this.form.base.value().value.set(requiredToBuy());
        });

        effect(() => {
            if (!this.form.base.value().value() && !this.form.base.own().value()) {
                this.form.color.value().value.set(false);
            }
        });
    }

    public updateFormValue(
        pattern: FullPatternEntityDto,
        cart: CartItemModel,
        bought: CartItemModel,
        enabled: boolean,
    ): void {
        const boughtSizes: number[] = bought?.sizes || [];
        const cartSizes: number[] = cart?.sizes || [];

        this.formEnabled.set(enabled);
        this.currentPattern.set(pattern);
        this.formValue.set({
            color: {
                exists: Boolean(pattern.color),
                own: Boolean(bought?.color),
                value: Boolean(cart?.color),
            },
            base: {
                own: Boolean(bought),
                value: Boolean(cart?.requiresPatternPurchase),
            },
            sizes: pattern.sizes.map((size: FullPatternSizeDto) => {
                const id: number = size.size.id;

                return {
                    id: size.size.id,
                    label: size.size.value,
                    own: boughtSizes.includes(id),
                    value: cartSizes.includes(id),
                };
            }),
        });
    }
}
