import { Component, input, InputSignal } from "@angular/core";
import { AmstoreColor } from '../core/color';


@Component({
    selector: 'amstore-chip',
    templateUrl: './chip.component.html',
    styleUrls: ['./chip.component.scss'],
    standalone: true,
    host: {
        class: 'amstore-chip amstore-chip-test',
        '[class.amstore-chip-small]': 'size() === "small"',
        '[class.amstore-chip-medium]': 'size() === "medium"',
        '[class.amstore-chip-large]': 'size() === "large"',
        '[class.is-dark]': 'isDark()',
        '[class.amstore-chip-stroked]': 'stroked()',
    }
})
export class AmstoreChipComponent extends AmstoreColor {
    public size: InputSignal<'small' | 'medium' | 'large'> = input('medium');
    public isDark: InputSignal<boolean> = input(false);
    public stroked: InputSignal<boolean> = input(false);
}
