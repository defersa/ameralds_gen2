import { Component } from '@angular/core';
import { AbstractFilterComponent } from "@am/shared/filters/filter.abstract";
import { FormControl, FormGroup } from "@angular/forms";
import { DestroyService } from "@am/utils/destroy.service";

@Component({
    selector: 'amstore-orders-filter',
    templateUrl: './orders-filter.component.html',
    styleUrls: ['./orders-filter.component.scss'],
    providers: [DestroyService],
    host: {
        class: 'amstore-filters'
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

    constructor() {
        super();
    }

}
