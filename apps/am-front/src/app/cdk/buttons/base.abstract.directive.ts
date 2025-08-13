import { Directive, HostBinding, input, Input, InputSignal } from "@angular/core";
import { AmstoreColor } from '../core/color';


@Directive({
    selector: 'button-base',
    standalone: false
})
export class AmstoreButtonBaseDirective extends AmstoreColor {
    @HostBinding('class')
    protected classes: string = 'amstore-button-base';

    public disabled: InputSignal<boolean> = input(false);
}
