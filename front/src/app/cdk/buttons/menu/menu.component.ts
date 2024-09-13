import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AmstoreButtonBaseDirective } from '../base.abstract.directive';

@Component({
    selector: 'amstore-button-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-button-menu',
        '[class.amstore-button-menu-active]': 'active'
    }
})
export class AmstoreButtonMenuComponent extends AmstoreButtonBaseDirective {

    @Input()
    public active: boolean = false;

}
