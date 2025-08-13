import {
    ChangeDetectorRef,
    Component,
    DestroyRef,
    Directive,
    HostBinding,
    inject, input,
    Input,
    InputSignal,
    OnInit
} from "@angular/core";
import { AbstractControl, ControlValueAccessor, FormControl, NgControl, Validators } from "@angular/forms";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { map, startWith, takeUntil } from "rxjs/operators";
import { AmstoreColor, ThemePalette } from '../core/color';


export type SelectOption = {
    label: string;
    value: string | number | null;
}

@Directive()
export class AmstoreFormsBaseDirective extends AmstoreColor implements ControlValueAccessor, OnInit {
    public label: InputSignal<string | number> = input();

    public readonly ngControl: NgControl = inject(NgControl, { self: true, optional: true });
    protected readonly destroyRef: DestroyRef = inject(DestroyRef);

    constructor() {
        super();

        if (this.ngControl !== null) {
            this.ngControl.valueAccessor = this;
        }
    }

    public errorStatusChanges$: Observable<boolean>;
    public control: FormControl;

    public ngOnInit(): void {
        this.control = this.ngControl.control as FormControl;

        this.errorStatusChanges$ = this.control.statusChanges
            .pipe(
                startWith(null),
                map(() => Boolean(this.control.errors)),
            );

        this.checkInitValue();
    }

    public writeValue(value?: unknown): void {
    }

    public registerOnChange(fn: (value?: unknown) => void): void {
    }

    public registerOnTouched(fn: (value?: unknown) => void): void {
    }

    private checkInitValue(): void {
        const hasValue: boolean = Array.isArray(this.control.value) ? this.control.value.length > 0 : Boolean(this.control.value);

        if (this.control.untouched && hasValue) {
            this.control.markAsTouched();
        }
    }
}

