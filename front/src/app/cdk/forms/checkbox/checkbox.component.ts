import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { AmstoreFormsBaseDirective } from '../forms.abstract.directive';
import { MatCheckbox } from "@angular/material/checkbox";
import { ReactiveFormsModule } from "@angular/forms";


@Component({
    selector: "amstore-checkbox",
    templateUrl: "./checkbox.component.html",
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCheckbox,
        ReactiveFormsModule
    ],
    host: {
        class: "amstore-checkbox"
    }
})
export class AmstoreCheckboxComponent extends AmstoreFormsBaseDirective {
}
