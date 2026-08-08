import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject, Injector,
    input,
    InputSignal,
    OnInit,
    ViewEncapsulation
} from "@angular/core";
import { AmstoreFormsBaseDirective, SelectOption } from "@am-front/cdk/forms/forms.abstract.directive";
import { map, startWith } from "rxjs/operators";
import { DestroyService } from "@am-front/utils/destroy.service";
import { toObservable } from "@angular/core/rxjs-interop";
import { combineLatest, Observable } from "rxjs";
import { AsyncPipe } from "@angular/common";
import { AmstoreChipComponent } from "@am-front/cdk/chip/chip.component";
import { MatCheckbox } from "@angular/material/checkbox";


@Component({
    selector: "amstore-chips-checkbox",
    templateUrl: "./chips-checkbox.component.html",
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        AmstoreChipComponent,
        MatCheckbox
    ],
    host: {
        class: "amstore-chips-checkbox"
    }
})
export class AmstoreChipsCheckboxComponent extends AmstoreFormsBaseDirective implements OnInit {
    public items: InputSignal<SelectOption[]> = input([]);

    public itemList$: Observable<{ checked: boolean; item: SelectOption }[]>;

    protected override destroyRef: DestroyRef = inject(DestroyRef);
    protected injector: Injector = inject(Injector);

    public override ngOnInit() {
        super.ngOnInit();

        if (!this.control) {
            return;
        }

        this.itemList$ = combineLatest([
            this.control.valueChanges.pipe(startWith(this.control.value)),
            toObservable(this.items, { injector: this.injector })
        ]).pipe(
            map(([, options]: [unknown, SelectOption[]]) => {
                const values: (number | string)[] = this.control.value ?? [];

                return (options || []).map((item: SelectOption) => ({
                    item,
                    checked: values.includes(item.value as number)
                }));
            })
        );
    }

    public change(checked: boolean, value: number | string): void {
        const values: (number | string)[] = this.control.value ?? [];
        this.control.markAsTouched();
        this.control.setValue(checked ? values.filter((item: number) => value !== item) : [...values, value]);
    }
}
