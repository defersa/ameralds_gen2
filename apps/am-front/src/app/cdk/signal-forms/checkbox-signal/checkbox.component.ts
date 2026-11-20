import { ChangeDetectionStrategy, Component, input, InputSignal, ViewEncapsulation } from "@angular/core";
import { MatCheckbox, MatCheckboxChange } from "@angular/material/checkbox";
import { AmstoreSignalFormsCheckboxBaseDirective } from "../forms.abstract.directive";


@Component({
    selector: "amstore-checkbox-signal",
    templateUrl: "./checkbox.component.html",
    styleUrl: "./checkbox.component.scss",
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCheckbox
    ],
    host: {
        class: "amstore-checkbox",
        "[class.amstore-checkbox-chip]": "appearance() === 'chip'"
    }
})
export class AmstoreCheckboxSignalComponent extends AmstoreSignalFormsCheckboxBaseDirective {
    /** Вариант оформления; не изменяет выбранное состояние и доступность чекбокса. */
    public readonly appearance: InputSignal<"default" | "chip"> = input<"default" | "chip">("default");

    public changeChecked(event: MatCheckboxChange): void {
        this.checked.set(event.checked);
    }
}
