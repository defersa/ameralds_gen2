import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl, FormControl } from "@angular/forms";


@Pipe({
    name: 'asFormControl',
    standalone: true
})
export class FormControlPipe implements PipeTransform {

    transform(value: AbstractControl): FormControl {
        return value as FormControl;
    }

}
