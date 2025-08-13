import { Component, input, InputSignal } from "@angular/core";
import { AmstoreButtonBaseDirective } from '../base.abstract.directive';


@Component({
    selector: 'amstore-button',
    templateUrl: './amstore-button.component.html',
    styleUrls: ['./amstore-button.component.scss'],
    standalone: true,
    host: {
        class: 'amstore-button-default',
        '[class.amstore-button-default-stroked]': 'stroked()',
        '[class.amstore-button-default-disabled]': 'disabled()',
        '[class.amstore-button-default-medium]': 'size() === "medium"',
        '[class.amstore-button-default-large]': 'size() === "large"',
    }
})
export class AmstoreButtonComponent extends AmstoreButtonBaseDirective {
    public size: InputSignal<'medium' | 'large'> = input('medium');
    public stroked: InputSignal<boolean> = input(false);
}
