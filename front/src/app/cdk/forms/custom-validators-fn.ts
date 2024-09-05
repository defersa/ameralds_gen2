import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export class CustomValidatorFns {
    public static getMinValue: (value: number) => ValidatorFn = function (value: number): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control) {
                return null;
            }
            if (Number(control.value) < value) {
                return { minValue: { current: control.value, expected: value } };
            }
            return null;
        }
    }

    public static getNotUniqValue: (values: unknown[]) => ValidatorFn = function (values: unknown[]): ValidatorFn {
        return (control: AbstractControl) => {
            if (!control) {
                return null;
            }
            if (values.includes(control.value)) {
                return { notUniq: { value: control.value } };
            }
            return null;
        }
    }

    public static getNotUniqBehaviorValue: <T>(subject: { getValue: () => T[] }, fieldName: string) =>
        ValidatorFn = function <T>(subject: { getValue: () => T[] }, fieldName: string): ValidatorFn {
        return (control: AbstractControl) => {
            const values: unknown[] = subject.getValue().map((item: T) => item[fieldName]);

            if (!control) {
                return null;
            }
            if (values.includes(control.value)) {
                return { notUniq: { value: control.value } };
            }
            return null;
        }
    }

    public static isEmail: ValidatorFn = (control: AbstractControl) => {
        if (!control) {
            return null;
        }
        const isEmail: boolean = Boolean(String(control.value)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/));

        if (!isEmail) {
            return { notEmail: true };
        }

        return null;
    }
    public static getEqualPassword: (originControl: AbstractControl) => ValidatorFn = function (originControl: AbstractControl): ValidatorFn {
        return (control: AbstractControl) => {
            if (!control) {
                return null;
            }
            if (originControl.value !== control.value) {
                return { notEqualPassword: true };
            }
            return null;
        }
    }

    public static getPasswordComplexity: ValidatorFn = (control: AbstractControl) => {
        if (!control) {
            return null;
        }
        const isComplexity: boolean = (/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z!@#$%^&*]{6,}/g).test(String(control.value));
        if (isComplexity) {
            return null;
        }

        return { notComplexity: true };
    }
}
