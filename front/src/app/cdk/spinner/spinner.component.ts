import { Component, ElementRef, Input, ViewEncapsulation } from '@angular/core';
import { ProgressSpinnerMode } from "@angular/material/progress-spinner";
import { AmstoreColor } from "@am/cdk/core/color";

@Component({
    selector: 'amstore-spinner',
    templateUrl: './spinner.component.html',
    styleUrls: ['./spinner.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-spinner'
    }
})
export class AmstoreSpinnerComponent extends AmstoreColor {

    @Input()
    public isDeterminate: boolean = false;

    @Input()
    public strokeWidth: number = 15;

    @Input()
    public value: number = 0;

    public get mode(): ProgressSpinnerMode {
        return this.isDeterminate ? 'determinate' : 'indeterminate';
    }

    constructor(public elementRef: ElementRef) {
        super(elementRef);
    }

}
