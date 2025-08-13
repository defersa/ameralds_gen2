import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';


@Pipe({
    name: 'asFormGroup',
    standalone: true,
})
export class FormGroupPipe implements PipeTransform {
    public transform(value: AbstractControl): FormGroup {
        return value as FormGroup;
    }
}
