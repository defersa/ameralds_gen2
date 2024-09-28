import { Component } from '@angular/core';
import { AbstractFilterComponent } from "@am/shared/filters/filter.abstract";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import {
    AmstorePanelExpandComponent,
    AmstorePanelHeaderComponent
} from "@am/cdk/panel/panel-expand/panel-expand.component";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { AmstoreSelectComponent } from "@am/cdk/forms/select/select.component";
import { AmstoreDataRangePickerComponent } from "@am/cdk/forms/data-range-picker/amstore-data-range-picker.component";


@Component({
    selector: "amstore-orders-filter",
    templateUrl: "./orders-filter.component.html",
    styleUrls: ["./orders-filter.component.scss"],
    standalone: true,
    imports: [
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreButtonComponent,
        IconsComponent,
        AmstoreInputComponent,
        AmstoreSelectComponent,
        AmstoreDataRangePickerComponent,
        ReactiveFormsModule
    ],
    host: {
        class: "amstore-filters"
    }
})
export class OrdersFilterComponent extends AbstractFilterComponent {
    public startFormControl: FormControl = new FormControl();
    public endFormControl: FormControl = new FormControl();

    public filterForm: FormGroup = new FormGroup({
            email: new FormControl(),
            startDate: this.startFormControl,
            endDate: this.endFormControl,
        });
}
