import { Component, input, InputSignal } from "@angular/core";
import { AmstoreButtonBaseDirective } from '../base.abstract.directive';


@Component({
    selector: 'button[amstore-button-round], a[amstore-button-round]',
    templateUrl: './round.component.html',
    styleUrls: ['./round.component.scss'],
    standalone: true,
    host: {
        class: 'amstore-button-round',
        '[class.left-side]': 'roundSide() === "left"',
        '[class.right-side]': 'roundSide() === "right"',
        '[class.both-side]': 'roundSide() === "both"',
        '[class.amstore-round-has-badge]': 'badge()',
        '[class.amstore-round-image]': 'image()',
        '[attr.style]': 'image() ? "background-image: url(" + image() + ");"  : null'
    }
})
export class AmstoreButtonRoundComponent extends AmstoreButtonBaseDirective {
    public roundSide: InputSignal<'left' | 'right' | 'both'> = input('both');
    public badge: InputSignal<string | number> = input();
    public image: InputSignal<string> = input();
}
