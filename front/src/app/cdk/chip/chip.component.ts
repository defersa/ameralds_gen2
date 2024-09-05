import { Component, ElementRef, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { AmstoreColor } from '../core/color';

@Component({
    selector: 'amstore-chip',
    templateUrl: './chip.component.html',
    styleUrls: ['./chip.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-chip',
        '[class.amstore-chip-small]': 'size === "small"',
        '[class.amstore-chip-medium]': 'size === "medium"',
        '[class.amstore-chip-large]': 'size === "large"',
        '[class.is-dark]': 'isDark',
        '[class.amstore-chip-stroked]': 'stroked',
    }
})
export class AmstoreChipComponent extends AmstoreColor {

    @Input()
    public size: 'small' | 'medium' | 'large' = 'medium';

    @Input()
    public isDark: boolean = false;

    @Input()
    public stroked: boolean = false;


    constructor(public elementRef: ElementRef) {
        super(elementRef)
    }

}
