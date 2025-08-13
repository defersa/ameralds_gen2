import { Component } from '@angular/core';
import { AbstractFilterComponent } from "@am-front/shared/filters/filter.abstract";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import {
    AmstorePanelExpandComponent,
    AmstorePanelHeaderComponent
} from "@am-front/cdk/panel/panel-expand/panel-expand.component";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AmstoreInputComponent } from "@am-front/cdk/forms/input/input.component";
import { AmstoreSelectComponent } from "@am-front/cdk/forms/select/select.component";
import { AmstoreDataRangePickerComponent } from "@am-front/cdk/forms/data-range-picker/amstore-data-range-picker.component";


@Component({
    selector: "amstore-orders-filter",
    templateUrl: "./orders-filter.component.html",
    styleUrls: ["./orders-filter.component.scss"],
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
