import { Component, input, Input, InputSignal, ViewEncapsulation } from "@angular/core";
import { AmstoreFormsBaseDirective } from "@am/cdk/forms/forms.abstract.directive";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDateRangeInput, MatDateRangePicker } from "@angular/material/datepicker";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: "amstore-data-range-picker",
    templateUrl: "./amstore-data-range-picker.component.html",
    styleUrls: ["./amstore-data-range-picker.component.scss"],
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatFormFieldModule,
        MatDateRangeInput,
        ReactiveFormsModule,
        IconsComponent,
        MatDateRangePicker
    ]
})
export class AmstoreDataRangePickerComponent extends AmstoreFormsBaseDirective {
    public startPlaceholder: InputSignal<string> = input();
    public endPlaceholder: InputSignal<string> = input();

    @Input()
    public startFormControl: FormControl;

    @Input()
    public endFormControl: FormControl;


}
