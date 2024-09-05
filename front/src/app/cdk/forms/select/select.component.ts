import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AmstoreFormsBaseDirective, SelectOption } from '../forms.abstract.directive';
import { DestroyService } from "@am/utils/destroy.service";

@Component({
    selector: 'amstore-form-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [DestroyService],
    host: {
        class: 'amstore-select'
    }
})
export class AmstoreSelectComponent extends AmstoreFormsBaseDirective {

    @Input()
    public multiple: boolean = false;

    @Input()
    public items: SelectOption[] | null | undefined = [];

}
