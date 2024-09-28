import { Pipe, PipeTransform } from "@angular/core";
import { ValidationErrors } from "@angular/forms";
import { getControlErrors } from "@am/cdk/forms/errors/error-message-builder";


@Pipe({ name: 'errors', standalone: true })
export class ErrorsPipe implements PipeTransform {
    transform(errors: ValidationErrors | null): string {
        return getControlErrors(errors);
    }
}
