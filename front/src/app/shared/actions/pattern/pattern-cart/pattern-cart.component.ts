import { Component, computed, inject, input, InputSignal, Signal } from "@angular/core";
import { CartService, ICartPattern } from "@am/services/cart.service";
import { FullPatternEntityDto, PatternEntityDto, ShortOrderPatternDto } from "@am/root/api";
import { toSignal } from "@angular/core/rxjs-interop";
import { IdRecord } from "@am/interface/common.interface";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import {
    PatternCartEditDialogComponent
} from "@am/shared/actions/pattern/pattern-cart-edit-dialog/pattern-cart-edit-dialog.component";
import { DialogService } from "@am/core/dialog/dialog.service";


export enum PatternCartState {
    Bought = 1,
    Edit,
    ToCart,
}

@Component({
    selector: "app-pattern-cart",
    standalone: true,
    imports: [
        AmstoreButtonComponent
    ],
    templateUrl: "./pattern-cart.component.html",
    styleUrl: "./pattern-cart.component.scss"
})
export class PatternCartComponent {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly cartService: CartService = inject(CartService);
    private readonly dialog: DialogService = inject(DialogService);

    public readonly ownPatterns: Signal<IdRecord<ShortOrderPatternDto>> = toSignal(this.cartService.ownPatterns$);
    public readonly cartPatterns: Signal<IdRecord<ICartPattern>> = toSignal(this.cartService.patternsCart$);
    public readonly patternCartState: typeof PatternCartState = PatternCartState;
    public readonly state: Signal<PatternCartState> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const ownPatterns: IdRecord<ShortOrderPatternDto> = this.ownPatterns();
        const cartPatterns: IdRecord<ICartPattern> = this.cartPatterns();

        if (!pattern) {
            return null;
        }

        const own: ShortOrderPatternDto = ownPatterns[pattern.id];
        const cart: ICartPattern = cartPatterns[pattern.id];

        if (own?.sizes.length === pattern.sizes.length) {
            return PatternCartState.Bought;
        }

        if (cart) {
            return PatternCartState.Edit;
        }

        return PatternCartState.ToCart;
    });

    public removeFromCart(): void {
        this.cartService.removePattern(this.pattern().id);
    }

    public change(): void {
        this.dialog.openCustomDialog(PatternCartEditDialogComponent, <unknown>{
            data: this.pattern(),
        })
        // PatternCartEditDialogComponent
        // this.
    }
}
