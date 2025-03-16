import { Component, computed, inject, Signal } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import {
    FullPatternEntityDto, type FullPatternSizeDto,
    PatternEntityDto,
    type PatternSizeDto,
    ShortOrderPatternDto,
    type SizeDto
} from "@am/root/api";
import { IdRecord } from "@am/interface/common.interface";
import { toSignal } from "@angular/core/rxjs-interop";
import { CartService, ICartPattern } from "@am/services/cart.service";
import { PatternCartState } from "@am/shared/actions/pattern/pattern-cart/pattern-cart.component";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { SizesService } from "@am/services/sizes.service";
import { AmstoreSlideComponent } from "@am/cdk/slide/slide.component";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";


interface PatternSizeForm {
    label: number;
    control: FormControl<boolean>;
}

interface PatternCartEditForm {
    sizes: PatternSizeForm[];
    hasColor: boolean;
    form: {
        sizes: FormGroup;
        color: FormControl<boolean>;
    };
}

@Component({
    selector: "app-pattern-cart-edit-dialog",
    imports: [
        AmstoreSlideComponent,
        ReactiveFormsModule,
        AmstoreCheckboxComponent,
        AmstoreButtonComponent
    ],
    templateUrl: "./pattern-cart-edit-dialog.component.html",
    styleUrl: "./pattern-cart-edit-dialog.component.scss"
})
export class PatternCartEditDialogComponent {
    public readonly pattern: FullPatternEntityDto = inject(MAT_DIALOG_DATA);
    private readonly cartService: CartService = inject(CartService);
    private readonly dialogRef: MatDialogRef<PatternCartEditDialogComponent> = inject(MatDialogRef<PatternCartEditDialogComponent>);

    public readonly ownPatterns: Signal<IdRecord<ShortOrderPatternDto>> = toSignal(this.cartService.ownPatterns$);
    public readonly cartPatterns: Signal<IdRecord<ICartPattern>> = toSignal(this.cartService.patternsCart$);
    public readonly patternCartEdit: Signal<PatternCartEditForm> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern;
        const ownPatterns: IdRecord<ShortOrderPatternDto> = this.ownPatterns();
        const cartPatterns: IdRecord<ICartPattern> = this.cartPatterns();

        if (!pattern) {
            this.dialogRef.close();
        }

        const own: ShortOrderPatternDto = ownPatterns[pattern.id];
        const cart: ICartPattern = cartPatterns[pattern.id];
        const sizesForm: FormGroup = new FormGroup({});
        const hasColor: boolean = Boolean(pattern.color);
        const colorControl: FormControl<boolean> = new FormControl<boolean>({ value: own?.color || cart?.color, disabled: own?.color });
        const sizes: PatternSizeForm[] = pattern
            .sizes
            .map((size: FullPatternSizeDto) => {
                const id: number = size.id;
                const isOwn: boolean = own?.sizes?.includes(id);
                const isCart: boolean = cart?.sizes?.includes(id);
                const control: FormControl<boolean> = new FormControl({ value: isOwn || isCart, disabled: isOwn });
                const label: number = size.size.value;

                sizesForm.setControl(id as unknown as string, control);

                return {
                    control,
                    label,
                };
            });

        return {
            form: {
                sizes: sizesForm,
                color: colorControl,
            },
            sizes,
            hasColor,
        };
    });
}
