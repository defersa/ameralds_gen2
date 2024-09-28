import { Component, computed, DestroyRef, inject, input, InputSignal, OnInit, Signal } from "@angular/core";
import { IPattern, PattenSizeFiles } from "@am/interface/pattern.interface";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { SelectOption } from "@am/cdk/forms/forms.abstract.directive";
import { AdminOrderService } from "@am/services/admin-order.service";
import { map } from "rxjs/operators";
import { IAdminCart, IPatternPurchase } from "@am/interface/order.interface";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AmstoreChipsCheckboxComponent } from "@am/cdk/forms/chips-checkbox/chips-checkbox.component";
import { AmstoreSlideComponent } from "@am/cdk/slide/slide.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "admin-pattern-cart",
    templateUrl: "./pattern-cart.component.html",
    styleUrls: ["./pattern-cart.component.scss"],
    imports: [
        ReactiveFormsModule,
        AmstoreChipsCheckboxComponent,
        AmstoreSlideComponent,
        AmstoreButtonComponent,
        IconsComponent
    ],
    standalone: true
})
export class PatternCartComponent implements OnInit {
    public pattern: InputSignal<IPattern> = input();
    public isEmpty: boolean = false;

    protected destroyRef: DestroyRef = inject(DestroyRef);
    public adminOrderService: AdminOrderService = inject(AdminOrderService);

    public form: FormGroup = new FormGroup({
        color: new FormControl(),
        sizes: new FormControl([])
    });

    public sizeItems: Signal<SelectOption[]> = computed(() =>
        this.pattern().sizes.map((item: PattenSizeFiles) => ({
            label: String(item.size.value),
            value: item.id
        })));

    public ngOnInit(): void {
        this.form.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((values: IPatternPurchase) => {
                if (PatternCartComponent.isEmptyValues(values) && !values.sizes?.length) {
                    this.adminOrderService.removePattern(this.pattern().id);
                    return;
                }

                this.adminOrderService.addPattern({
                    ...values,
                    pattern: this.pattern().id
                });
            });

        this.adminOrderService.order$
            .pipe(
                map((cart: IAdminCart) => cart.purchases.find((purchase: IPatternPurchase) => purchase.pattern === this.pattern().id)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((purchase: IPatternPurchase) => {
                const value: IPatternPurchase = this.form.value;
                this.isEmpty = PatternCartComponent.isEmptyValues(value);

                if (!purchase && this.isEmpty) {
                    return;
                }

                if (purchase?.color === value?.color && value?.sizes.sort().join() === purchase?.sizes.sort().join()) {
                    return;
                }

                this.form.setValue({
                    color: purchase?.color || false,
                    sizes: purchase?.sizes ?? []
                });
            });
    }

    public removePattern(): void {
        this.adminOrderService.removePattern(this.pattern().id);
    }

    private static isEmptyValues(value: IPatternPurchase): boolean {
        return !value.color && !value?.sizes.length;
    }
}
