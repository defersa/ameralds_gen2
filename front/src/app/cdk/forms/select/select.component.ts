import { Component, input, InputSignal, ViewEncapsulation } from "@angular/core";
import { AmstoreFormsBaseDirective, SelectOption } from '../forms.abstract.directive';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatOption, MatSelect } from "@angular/material/select";
import { ReactiveFormsModule } from "@angular/forms";
import { AsyncPipe } from "@angular/common";
import { ErrorsPipe } from "@am/cdk/forms/errors/errors.pipe";


@Component({
    selector: "amstore-form-select",
    templateUrl: "./select.component.html",
    styleUrls: ["./select.component.scss"],
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatFormFieldModule,
        MatSelect,
        ReactiveFormsModule,
        MatOption,
        AsyncPipe,
        ErrorsPipe
    ],
    host: {
        class: "amstore-select"
    }
})
export class AmstoreSelectComponent extends AmstoreFormsBaseDirective {
    public multiple: InputSignal<boolean> = input(false);
    public items: InputSignal<SelectOption[]> = input();
}
