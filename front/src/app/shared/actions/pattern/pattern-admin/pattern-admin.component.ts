import { Component, DestroyRef, effect, inject } from "@angular/core";
import { FormGroup, ReactiveFormsModule, UntypedFormControl } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { IPattern } from "@am/interface/pattern.interface";
import { AdminService } from "@am/services/admin.service";
import { CartPattern } from "@am/interface/cart.interface";
import { AbstractPatternCard, SizeWithControl } from "@am/shared/actions/pattern/pattern.abstract";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AmstoreCheckboxComponent } from "@am/cdk/forms/checkbox/checkbox.component";
import { AmstoreSlideComponent } from "@am/cdk/slide/slide.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";


@Component({
    selector: "amstore-pattern-admin",
    templateUrl: "./pattern-admin.component.html",
    styleUrls: ["./pattern-admin.component.scss"],
    standalone: true,
    imports: [
        AmstoreCheckboxComponent,
        ReactiveFormsModule,
        AmstoreSlideComponent,
        AmstoreButtonComponent
    ]
})
export class PatternAdminComponent extends AbstractPatternCard {
    public formGroup: FormGroup = new FormGroup({});
    public colorControl: UntypedFormControl = new UntypedFormControl(false);

    public inCart: boolean = false;
    public canAdd: boolean = false;

    public destroyOldPattern: Subject<void> = new Subject<void>();

    private admin: AdminService = inject(AdminService);
    protected destroyRef: DestroyRef = inject(DestroyRef);

    constructor() {
        super();

        effect(() => {
            this.setFormControl(this.pattern());
        });
    }

    public setFormControl(pattern: IPattern): void {
        this.destroyOldPattern.next();
        this.destroyOldPattern.complete();

        this.destroyOldPattern = new Subject();
        this.colorControl = new UntypedFormControl(false);

        const sizesGroup: FormGroup = new FormGroup({});

        this.sizesWithControl().forEach((item: SizeWithControl) => {
            sizesGroup.addControl(String(item.id), item.control)
        });
        this.formGroup = new FormGroup({
            sizes: sizesGroup,
            colors: this.colorControl
        });

        this.admin.cart$
            .pipe(
                takeUntil(this.destroyOldPattern),
                takeUntilDestroyed(this.destroyRef))
            .subscribe((cart: CartPattern[]) => {
                const pattern: CartPattern | undefined = cart.find((item: CartPattern) => item.id === this.pattern().id);

                if (pattern) {
                    this.colorControl.setValue(pattern.colors);
                    this.sizesWithControl().forEach((item: SizeWithControl) => item.control.setValue(pattern.sizes.includes(item.id)));
                }

                this.inCart = Boolean(pattern);
                this.canAdd = false;

            });

        this.formGroup.valueChanges
            .pipe(
                takeUntil(this.destroyOldPattern),
                takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.canAdd =
                    this.sizesWithControl().filter((item: SizeWithControl) => item.control.value).length ||
                    this.colorControl.value;
            });
    }

    public addToCart(): void {
        this.admin.addPatterToCart({
            id: this.pattern().id,
            price: {en: 0, ru: 0},
            colors: this.colorControl.value,
            sizes: this.sizesWithControl()
                .filter((item: SizeWithControl) => item.control.value)
                .map((item: SizeWithControl) => item.id)
        })
    }

    public removeFromCart(): void {
        this.admin.removePatterToCart(this.pattern().id);

        this.colorControl.setValue(false);
        this.sizesWithControl().forEach((item: SizeWithControl) => item.control.setValue(false));
    }

}
