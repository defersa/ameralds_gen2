import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef, inject,
    Input,
    OnChanges,
    SimpleChanges,
    ViewEncapsulation
} from '@angular/core';
import { AmstoreFormsBaseDirective, SelectOption } from "@am/cdk/forms/forms.abstract.directive";
import { startWith, takeUntil } from "rxjs/operators";
import { DestroyService } from "@am/utils/destroy.service";


@Component({
    selector: 'amstore-chips-checkbox',
    templateUrl: './chips-checkbox.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [DestroyService],
    host: {
        class: 'amstore-chips-checkbox'
    }
})
export class AmstoreChipsCheckboxComponent extends AmstoreFormsBaseDirective implements OnChanges {
    @Input()
    public items: SelectOption[] | null | undefined = [];

    public itemList: { checked: boolean; item: SelectOption }[] = [];


    constructor(public elementRef: ElementRef,
                private _changeDetectorRef: ChangeDetectorRef) {
        super(elementRef, _changeDetectorRef);
    }

    protected onDestroy: DestroyService = inject(DestroyService);

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.items?.currentValue || changes.control?.currentValue) {
            this.updateItemList();
        }

        if (changes.control?.currentValue !== changes.control?.previousValue) {
            this._control.valueChanges
                .pipe(
                    startWith(this._control.value),
                    takeUntil(this._controlChanged),
                    takeUntil(this.onDestroy),
                )
                .subscribe(() => this.updateItemList());
        }
    }

    public change(checked: boolean, value: number | string): void {
        const values: (number | string)[] = this.control.value ?? [];
        this.control.markAsTouched();
        this.control.setValue(checked ? values.filter((item: number) => value !== item) : [...values, value]);
    }

    public updateItemList(): void {
        const values: number[] = this.control.value || [];

        this.itemList = this.items.map((item: SelectOption) => ({
            item,
            checked: values.includes(item.value as number),
        }))
    }
}
