import { Component, ElementRef, Input, OnInit, ViewEncapsulation } from '@angular/core';
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
export class AmstoreButtonMenuComponent extends AmstoreButtonBaseDirective implements OnInit {

    @Input()
    public active: boolean = false;

    constructor(public elementRef: ElementRef) {
        super(elementRef);
    }

    public ngOnInit(): void {
    }

}
