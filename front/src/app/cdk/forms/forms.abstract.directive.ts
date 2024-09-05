import { ChangeDetectorRef, Component, Directive, ElementRef, HostBinding, inject, Input } from '@angular/core';
import { AbstractControl, FormControl, Validators } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { AmstoreColor, ThemePalette } from '../core/color';
import { getControlErrors } from './error-message-builder';
import { DestroyService } from "@am/utils/destroy.service";


export type SelectOption = {
    label: string;
    value: string | number | null;
}

@Directive({
    selector: 'forms-base',
    providers: [DestroyService],
})
export class AmstoreFormsBaseDirective extends AmstoreColor {
    @HostBinding('class')
    protected classes: string = 'amstore-forms';

    public get isErrorState(): boolean {
        return this.control?.invalid && this?.control.touched;
    }

    @Input()
    public required: boolean = false;

    @Input()
    public set nullControl(value: AbstractControl) {
        if (value) {
            this.control = value;
        }
    };

    @Input()
    public get control(): AbstractControl {
        return this._control;
    };

    public set control(value: AbstractControl) {
        if (this._controlChanged) {
            this._controlChanged.next();
            this._controlChanged.complete();
        }

        this._controlChanged = new Subject<void>();

        this._control = value;

        this._control.statusChanges
            .pipe(
                startWith(""),
                takeUntil(this._controlChanged),
                takeUntil(this.onDestroy),
            )
            .subscribe(() => {
                const errors: string | null = this.control.invalid ? getControlErrors(this.control.errors) : null;
                this.errors$.next(errors);
                this.changeDetector.markForCheck();
            });

        if (this.required) {
            this._control.addValidators([Validators.required])
        }

        this.changeDetector.detectChanges();
    };

    protected _control: AbstractControl = new FormControl();
    protected _controlChanged: Subject<void>;
    protected onDestroy: DestroyService = inject(DestroyService);

    public get formControl(): FormControl {
        return this.control as FormControl;
    }

    @Input()
    public name: string = '';

    @Input()
    public autocomplete: string = '';

    public errors$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    @Input()
    public get isContrast(): boolean {
        return this._isContrast;
    }

    public set isContrast(value: boolean) {
        this._isContrast = value;
        this.classes = 'amstore-forms' + (this._isContrast ? ' is-contrast' : '');
    }

    private _isContrast: boolean = false;

    protected defaultColor: ThemePalette = 'primary';

    constructor(public elementRef: ElementRef, protected changeDetector: ChangeDetectorRef) {
        super(elementRef)
    }

}

@Component({
    selector: 'amstore-forms-label',
    template: '<ng-content></ng-content>'
})
export class AmstoreFormLabel {

    constructor() {
    }
}
