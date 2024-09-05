import { Injectable } from "@angular/core";
import { AbstractControl, UntypedFormControl, ValidatorFn } from "@angular/forms";
import { ArrayComponentListService } from "./array-component-list.service";

@Injectable({
    providedIn: 'root'
})
export class ArrayValidatorFns {
    constructor(
        private _arrayComponentList: ArrayComponentListService
    ) { }

    public getNotUniqValue(controlName: string): ValidatorFn {
        return (control: AbstractControl) => {
            if (!control) {
                return null;
            }
            let controlList: UntypedFormControl[] | undefined = this._arrayComponentList.getControls(controlName);

            if(controlList) {
                controlList = controlList.filter((item: UntypedFormControl) => item !== control);

                return controlList.some((item: UntypedFormControl) => item.value === control.value)
                    ? { notUniq: {value: control.value }}
                    : null;
            }
            return null;
        }
    }
}
