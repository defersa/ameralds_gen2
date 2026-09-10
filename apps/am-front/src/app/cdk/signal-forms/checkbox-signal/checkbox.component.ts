import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { MatCheckbox, MatCheckboxChange } from "@angular/material/checkbox";
import { AmstoreSignalFormsCheckboxBaseDirective } from "../forms.abstract.directive";


@Component({
    selector: "amstore-checkbox-signal",
    templateUrl: "./checkbox.component.html",
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCheckbox
    ],
    host: {
        class: "amstore-checkbox"
    }
})
export class AmstoreCheckboxSignalComponent extends AmstoreSignalFormsCheckboxBaseDirective {
    public changeChecked(event: MatCheckboxChange): void {
        this.checked.set(event.checked);
    }
}
