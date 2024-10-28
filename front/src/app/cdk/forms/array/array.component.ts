import {
    ChangeDetectionStrategy,
    Component, DestroyRef, inject, input,
    Input, InputSignal,
    ViewEncapsulation
} from "@angular/core";
import { FormControl, NgControl, UntypedFormArray, ValidatorFn } from "@angular/forms";
import { AmstoreFormsBaseDirective, SelectOption } from '../forms.abstract.directive';
import { DestroyService } from "@am/utils/destroy.service";
import { KeyValuePipe, NgStyle } from "@angular/common";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";
import { AmstoreInputComponent } from "@am/cdk/forms/input/input.component";
import { Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";


@Component({
    selector: "amstore-form-array",
    templateUrl: "./array.component.html",
    styleUrls: ["./array.component.scss"],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    host: {
        class: "amstore-form-array"
    }
})
export class AmstoreFormArrayComponent extends AmstoreFormsBaseDirective{
    public ngOnInit(): void {
        super.ngOnInit();

        console.log(this.control)
    }
}
