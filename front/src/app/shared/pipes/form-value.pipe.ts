import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { startWith } from "rxjs/operators";


@Pipe({
    name: 'formValue',
    standalone: true,
})
export class FormValuePipe<T> implements PipeTransform {
    public transform(form: AbstractControl, path: (string | number)[]): Observable<T> {
        const control: AbstractControl | null = form.get(path);

        return control ? control.valueChanges.pipe(startWith(control.value)) : of(null);
    }
}
