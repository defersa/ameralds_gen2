import { Component, input, InputSignal, ViewEncapsulation } from "@angular/core";
import { MatSlideToggle, MatSlideToggleChange } from "@angular/material/slide-toggle";
import { AmstoreSignalFormsCheckboxBaseDirective } from "../forms.abstract.directive";


@Component({
    selector: "amstore-slide-signal",
    templateUrl: "./slide.component.html",
    styleUrls: ["./slide.component.scss"],
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatSlideToggle
    ],
    host: {
        class: "amstore-slide",
        "[class.amstore-slide-small]": "size() === \"small\"",
        "[class.amstore-slide-medium]": "size() === \"medium\"",
        "[class.amstore-slide-large]": "size() === \"large\""
    }
})
export class AmstoreSlideSignalComponent extends AmstoreSignalFormsCheckboxBaseDirective {
    public size: InputSignal<'small' | 'medium' | 'large'> = input('medium');

    public changeChecked(event: MatSlideToggleChange): void {
        this.checked.set(event.checked);
    }
}
