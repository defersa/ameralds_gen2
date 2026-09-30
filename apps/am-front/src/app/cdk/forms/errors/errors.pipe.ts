import { Pipe, PipeTransform } from "@angular/core";
import { ValidationErrors } from "@angular/forms";
import type { ValidationError } from "@angular/forms/signals";
import { getControlErrors } from "@am-front/cdk/forms/errors/error-message-builder";


@Pipe({ name: 'errors', standalone: true })
export class ErrorsPipe implements PipeTransform {
    transform(errors: ValidationErrors | readonly ValidationError.WithOptionalFieldTree[] | null): string | null {
        return getControlErrors(errors);
    }
}
