import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnDestroy,
    ViewEncapsulation
} from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup, ValidatorFn } from '@angular/forms';
import { AmstoreFormsBaseDirective, SelectOption } from '../forms.abstract.directive';
import { ArrayComponentListService } from './array-component-list.service';
import { DestroyService } from "@am/utils/destroy.service";

export type ArrayComponent = {
    name: string;
    label: string;
    component: 'input' | 'select' | 'file' | 'label';
    classes: string;
    items?: SelectOption[];
    validator?: ValidatorFn[];
    order?: number;

}

@Component({
    selector: 'amstore-form-array',
    templateUrl: './array.component.html',
    styleUrls: ['./array.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [DestroyService],
    host: {
        class: 'amstore-form-array'
    }
})
export class AmstoreFormArrayComponent extends AmstoreFormsBaseDirective implements OnDestroy {

    @Input()
    public controlArray: UntypedFormArray = new UntypedFormArray([]);

    @Input()
    public get arrayComponentList(): ArrayComponent[] {
        return this._arrayComponentList;
    };

    public set arrayComponentList(value: ArrayComponent[]) {
        this._arrayComponentList = value.map((item: ArrayComponent, index: number) => ({ order: index, ...item}));
    };

    private _arrayComponentList: ArrayComponent[] = [];

    @Input()
    public set model(value: Record<string, unknown>[]) {
        value.forEach((item: Record<string, unknown>) => this.addFormGroup(item));
    }

    public get model(): Record<string, unknown>[] {
        return this.controlArray.getRawValue();
    }

    public get formGroups(): UntypedFormGroup[] {
        return this.controlArray.controls as UntypedFormGroup[];
    }

    constructor(public elementRef: ElementRef, private _arrayComponentListService: ArrayComponentListService, private _changeDetectorRef: ChangeDetectorRef) {
        super(elementRef, _changeDetectorRef);
    }

    public addFormGroup(value: Record<string, unknown>): void {
        const controlsNames: [string, ValidatorFn[]][] = this.arrayComponentList.map((item: ArrayComponent) => [item.name, item.validator || []]);
        const controls: Record<string, UntypedFormControl> = controlsNames
            .reduce((acc: Record<string, UntypedFormControl>, [key, fns]: [string, ValidatorFn[]]) => {
                const control: UntypedFormControl = new UntypedFormControl(value[key] || null, fns);

                this._arrayComponentListService.addControl(key, control);

                return {
                    ...acc,
                    [key]: control
                };
            }, {});
        this.controlArray.controls.push(new UntypedFormGroup(controls));
    }

    public removeFormGroup(index: number): void {
        const group: UntypedFormGroup = this.controlArray.controls[index] as UntypedFormGroup;

        this._removeFormGroup(group);

        this.controlArray.removeAt(index);
    }

    public getComponent(name: string): ArrayComponent | undefined {
        return this.arrayComponentList.find((item: ArrayComponent) => item.name === name);
    }

    public ngOnDestroy(): void {
        this.controlArray.controls
            .forEach((group: AbstractControl) => this._removeFormGroup(group as UntypedFormGroup));
    }

    private _removeFormGroup(group: UntypedFormGroup): void {
        Object.keys(group.controls)
            .forEach((key: string) => this._arrayComponentListService.removeControl(key, group.controls[key] as UntypedFormControl))
    }
}
