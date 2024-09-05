import { Directive, ElementRef, HostBinding, Input } from '@angular/core';
import { AmstoreColor, ThemePalette } from '../core/color';

@Directive({ selector: 'button-base'})
export class AmstoreButtonBaseDirective extends AmstoreColor {
    @HostBinding('class')
    protected classes: string = 'amstore-button-base';

    protected defaultColor: ThemePalette = 'primary';

    @Input()
    public disabled: boolean = false;

    constructor(public elementRef: ElementRef) {
        super(elementRef)
    }

}
