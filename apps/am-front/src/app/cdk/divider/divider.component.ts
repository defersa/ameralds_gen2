import { Component, input, InputSignal } from "@angular/core";
import { AmstoreColor } from "@am-front/cdk/core/color";


@Component({
    selector: 'amstore-divider',
    templateUrl: './divider.component.html',
    styleUrls: ['./divider.component.scss'],
    standalone: true,
    host: {
        class: 'amstore-divider',
        '[class.amstore-divider-vertical]': 'side() === "vertical"',
        '[class.is-contrast]': 'contrast()',
        '[class.is-dark]': 'dark()',
    }
})
export class AmstoreDividerComponent extends AmstoreColor {
    public side: InputSignal<'horizontal' | 'vertical'> = input('horizontal');
    public contrast: InputSignal<boolean> = input(false);
    public dark: InputSignal<boolean> = input(false);
}
