import { FormGroup, UntypedFormControl, ValidationErrors } from "@angular/forms";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export type FormErrorResponse = {
    formError?: Record<string, ValidationErrors>
}

export function formAsyncErrorHandler<T extends FormErrorResponse>(form: FormGroup, asyncAction: Observable<T>): Observable<T> {
    return asyncAction.pipe(
        map((project: T) => {
            if (project.formError) {
                Object.keys(project.formError).forEach((key: string) => {
                    const control: UntypedFormControl | unknown = form.get(key);
                    if(control instanceof UntypedFormControl) {
                        control.markAsTouched();
                        control.markAsDirty();
                        control.setErrors(project.formError?.[key] || {});
                    }
                });
                throw 'Invalid form';
            }
            return project;
        })
    )
}
