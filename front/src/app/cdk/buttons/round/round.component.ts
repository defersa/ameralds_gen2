import { Component, ElementRef, HostBinding, Input, OnInit } from '@angular/core';
import { AmstoreButtonBaseDirective } from '../base.abstract.directive';

@Component({
    selector: 'button[amstore-button-round], a[amstore-button-round]',
    templateUrl: './round.component.html',
    styleUrls: ['./round.component.scss'],
    host: {
        class: 'amstore-button-round',
        '[class.left-side]': 'roundSide === "left"',
        '[class.right-side]': 'roundSide === "right"',
        '[class.both-side]': 'roundSide === "both"',
        '[class.amstore-round-has-badge]': 'badge',
        '[class.amstore-round-image]': 'image',
        '[attr.style]': 'image ? "background-image: url(" + image + ");"  : null'
    }
})
export class AmstoreButtonRoundComponent extends AmstoreButtonBaseDirective {
    @Input()
    public roundSide: 'left' | 'right' | 'both' = 'both';

    @Input()
    public badge: string | number | null | undefined;

    @Input()
    public image: string | undefined;

    constructor(public elementRef: ElementRef) {
        super(elementRef);
    }

}
