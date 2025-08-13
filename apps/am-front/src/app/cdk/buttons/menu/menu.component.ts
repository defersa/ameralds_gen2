import { Component, input, InputSignal } from "@angular/core";
import { AmstoreButtonBaseDirective } from '../base.abstract.directive';


@Component({
    selector: 'amstore-button-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    standalone: true,
    host: {
        class: 'amstore-button-menu',
        '[class.amstore-button-menu-active]': 'active()'
    }
})
export class AmstoreButtonMenuComponent extends AmstoreButtonBaseDirective {
    public active: InputSignal<boolean> = input(false);
}
