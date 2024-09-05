import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormControl, UntypedFormControl } from '@angular/forms';
import { Subject } from "rxjs";

@Component({
    selector: 'amstore-slide',
    templateUrl: './slide.component.html',
    styleUrls: ['./slide.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-slide',
        '[class.amstore-slide-small]': 'size === "small"',
        '[class.amstore-slide-medium]': 'size === "medium"',
        '[class.amstore-slide-large]': 'size === "large"'
    }
})
export class AmstoreSlideComponent implements OnInit {

    @Input()
    public size: 'small' | 'medium' | 'large' = 'medium';

    @Input()
    public formControl: FormControl = new UntypedFormControl();


    @Input()
    public get control(): AbstractControl {
        return this.formControl;
    };

    public set control(value: AbstractControl) {
        this.formControl = value as FormControl;
    }


    constructor() { }

    ngOnInit(): void {
    }

}
