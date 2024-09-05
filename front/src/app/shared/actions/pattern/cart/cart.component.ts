import { Component, inject, Input, OnInit } from '@angular/core';
import { IPattern, PattenSizeFiles } from "@am/interface/pattern.interface";
import { FormControl, FormGroup } from "@angular/forms";
import { SelectOption } from "@am/cdk/forms/forms.abstract.directive";
import { AdminOrderService } from "@am/services/admin-order.service";
import { map, takeUntil } from "rxjs/operators";
import { IAdminCart, IPatternPurchase } from "@am/interface/order.interface";
import { DestroyService } from "@am/utils/destroy.service";


@Component({
    selector: 'admin-pattern-cart',
    templateUrl: './cart.component.html',
    styleUrls: ['./cart.component.scss'],
    providers: [DestroyService],
})
export class CartComponent implements OnInit {

    @Input()
    public set pattern(value: IPattern) {
        this._pattern = value;

        this.sizeItems = this._pattern.sizes.map((item: PattenSizeFiles) => ({
            label: String(item.size.value),
            value: item.id,
        }));
    }

    public get pattern(): IPattern {
        return this._pattern;
    }

    public isEmpty: boolean = false;

    private _pattern: IPattern;
    protected onDestroy: DestroyService = inject(DestroyService);

    public form: FormGroup = new FormGroup({
        color: new FormControl(),
        sizes: new FormControl([]),
    });

    public sizeItems: SelectOption[] = [];

    constructor(
        public adminOrderService: AdminOrderService,
    ) {
    }

    ngOnInit(): void {
        this.form.valueChanges.subscribe((values: IPatternPurchase) => {
            if (CartComponent.isEmptyValues(values) && !values.sizes?.length) {
                this.adminOrderService.removePattern(this.pattern.id);
                return;
            }

            this.adminOrderService.addPattern({
                ...values,
                pattern: this.pattern.id,
            });
        });

        this.adminOrderService.order$
            .pipe(
                map((cart: IAdminCart) => cart.purchases.find((purchase: IPatternPurchase) => purchase.pattern === this.pattern.id)),
                takeUntil(this.onDestroy),
            )
            .subscribe((purchase: IPatternPurchase) => {
                const value: IPatternPurchase = this.form.value;
                this.isEmpty = CartComponent.isEmptyValues(value);

                if (!purchase && this.isEmpty) {
                    return;
                }

                if (purchase?.color === value?.color && value?.sizes.sort().join() === purchase?.sizes.sort().join()) {
                    return;
                }

                this.form.setValue({
                    color: purchase?.color || false,
                    sizes: purchase?.sizes ?? [],
                });
            });
    }

    public removePattern(): void {
        this.adminOrderService.removePattern(this.pattern.id);
    }

    private static isEmptyValues(value: IPatternPurchase): boolean {
        return !value.color && !value?.sizes.length;
    }
}
