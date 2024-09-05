import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AmstoreFormsBaseDirective } from "@am/cdk/forms/forms.abstract.directive";
import { FormControl } from "@angular/forms";

@Component({
    selector: 'amstore-data-range-picker',
    templateUrl: './amstore-data-range-picker.component.html',
    styleUrls: ['./amstore-data-range-picker.component.scss'],
    encapsulation: ViewEncapsulation.None,

})
export class AmstoreDataRangePickerComponent extends AmstoreFormsBaseDirective {
    @Input()
    public startPlaceholder: string;

    @Input()
    public endPlaceholder: string;

    @Input()
    public startFormControl: FormControl;

    @Input()
    public endFormControl: FormControl;


}
