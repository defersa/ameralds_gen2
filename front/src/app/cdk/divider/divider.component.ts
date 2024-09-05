import { Component, ElementRef, Input } from '@angular/core';
import { AmstoreColor } from "@am/cdk/core/color";

@Component({
    selector: 'amstore-divider',
    templateUrl: './divider.component.html',
    styleUrls: ['./divider.component.scss'],
    host: {
        class: 'amstore-divider',
        '[class.amstore-divider-vertical]': 'side === "vertical"',
        '[class.is-contrast]': 'contrast',
        '[class.is-dark]': 'dark',
    }
})
export class AmstoreDividerComponent extends AmstoreColor {

    @Input()
    public side: 'horizontal' | 'vertical' = 'horizontal';

    @Input()
    public contrast: boolean = false;

    @Input()
    public dark: boolean = false;

    constructor(public elementRef: ElementRef) {
        super(elementRef)
    }

}
