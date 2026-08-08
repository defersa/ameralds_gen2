import {
    Component,
    computed,
    inject,
    Injector,
    input,
    InputSignal,
    OnInit,
    signal,
    Signal,
    WritableSignal,
} from "@angular/core";
import { CartService, ICartPattern } from "@am-front/services/cart.service";
import {
    FullPatternEntityDto,
    NumberEntityDto,
    PatternEntityDto,
    ShortOrderPatternDto,
} from "@am-front/root/api-v2";
import { toSignal } from "@angular/core/rxjs-interop";
import { IdRecord } from "@am-front/interface/common.interface";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { AmstoreCheckboxComponent } from "@am-front/cdk/forms/checkbox/checkbox.component";
import { AmstoreSlideComponent } from "@am-front/cdk/slide/slide.component";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import { LangNumberComponent } from "@am-front/shared/lang-text/lang-number.component";
import { Currency, LangService } from "@am-front/services/lang.service";
import { PatternCartGroup, PatternCartService } from "@am-front/shared/actions/pattern/pattern-cart/pattern-cart.service";
import { KeyValuePipe } from "@angular/common";


export enum PatternButtonState {
    Bought = 1,
    Editing,
    Edit,
    ToCart,
}

@Component({
    selector: "amstore-pattern-cart",
    imports: [
        AmstoreButtonComponent,
        AmstoreCheckboxComponent,
        AmstoreSlideComponent,
        ReactiveFormsModule,
        AmstoreChipComponent,
        LangNumberComponent,
        KeyValuePipe,
    ],
    providers: [PatternCartService],
    templateUrl: "./pattern-cart.component.html",
    styleUrl: "./pattern-cart.component.scss",
})
export class PatternCartComponent implements OnInit {
    public readonly pattern: InputSignal<FullPatternEntityDto> = input.required();

    private readonly cartService: CartService = inject(CartService);
    private readonly langService: LangService = inject(LangService);
    private readonly injector: Injector = inject(Injector);
    private readonly patternCartService: PatternCartService = inject(PatternCartService);

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

    public readonly editing: WritableSignal<boolean> = signal(false);
    public form: FormGroup<PatternCartGroup>;
    public formCart: Signal<[ICartPattern, PatternEntityDto]>;
    public price: Signal<NumberEntityDto>;

    public readonly currency: Signal<Currency> = this.langService.currency;
    public readonly patternCartButton: Signal<PatternButtonState> = computed(() => {
        const pattern: FullPatternEntityDto = this.pattern();
        const own: ShortOrderPatternDto = this.own();
        const cart: ICartPattern = this.cart();

        const bought: boolean = own?.sizes.length === pattern.sizes.length && (pattern.color ? own?.color : true);

        if (cart && this.editing()) {
            return PatternButtonState.Editing;
        } else if (bought) {
            return PatternButtonState.Bought;
        } else if (cart) {
            return PatternButtonState.Edit;
        }

        return PatternButtonState.ToCart;
    });

    public ngOnInit(): void {
        this.editing.set(!this.cart());
        this.form = this.patternCartService.initForm(this.pattern(), this.own, this.cart, this.editing);
        this.formCart = toSignal(this.patternCartService.getFormCartObservable(), { injector: this.injector });
        this.price = computed(() => this.cartService.getPrice(...this.formCart()));
    }

    public toCart(): void {
        const [cart, pattern]: [ICartPattern, PatternEntityDto] = this.formCart();
        if (cart.sizes.length === 0 && !cart.color) {
            this.form.setErrors({ incorrect: true });

            return;
        }

        this.cartService.addPattern(cart, pattern);
        this.editing.set(false);
    }

    public removeFromCart(): void {
        this.cartService.removePattern(this.pattern().id);
        this.editing.set(true);
    }

    public change(): void {
        this.editing.set(true);
    }

    public cancel(): void {
        this.editing.set(false);
    }
}
