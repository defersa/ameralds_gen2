import { Component, DestroyRef, inject, input, InputSignal, OnInit } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { AdminOrderService } from "@am-front/services/admin-order.service";
import { map } from "rxjs/operators";
import { IAdminCart, IPatternPurchase } from "@am-front/interface/order.interface";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AmstoreSlideComponent } from "@am-front/cdk/slide/slide.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import type { PatternEntityDto } from "@am-front/root/api";


@Component({
    selector: "admin-pattern-cart",
    templateUrl: "./pattern-cart.component.html",
    styleUrls: ["./pattern-cart.component.scss"],
    imports: [
        ReactiveFormsModule,
        AmstoreSlideComponent,
        AmstoreButtonComponent,
        IconsComponent
    ]
})
export class PatternCartComponent implements OnInit {
    public pattern: InputSignal<PatternEntityDto> = input();
    public isEmpty: boolean = false;

    protected destroyRef: DestroyRef = inject(DestroyRef);
    public adminOrderService: AdminOrderService = inject(AdminOrderService);

    public form: FormGroup = new FormGroup({
        color: new FormControl(),
        sizes: new FormControl([])
    });

    // public sizeItems: Signal<SelectOption[]> = computed(() =>
    //     this.pattern().sizes.map((item: PattenSizeFiles) => ({
    //         label: String(item.size.value),
    //         value: item.id
    //     })));

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
