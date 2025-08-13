import {
    ChangeDetectionStrategy,
    Component,
    input,
    InputSignal,
    output,
    OutputEmitterRef
} from "@angular/core";
import { AmstoreFormsBaseDirective } from '../forms.abstract.directive';
import { IconsName } from "@am-front/cdk/icons/icons.map";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ReactiveFormsModule } from "@angular/forms";
import { MatInput } from "@angular/material/input";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AsyncPipe } from "@angular/common";
import { ErrorsPipe } from "@am-front/cdk/forms/errors/errors.pipe";


@Component({
    selector: "amstore-forms-input",
    templateUrl: "./input.component.html",
    styleUrls: ["./input.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        ReactiveFormsModule,
        MatInput,
        IconsComponent,
        AsyncPipe,
        ErrorsPipe
    ]
})
export class AmstoreInputComponent extends AmstoreFormsBaseDirective {
    public hint: InputSignal<string> = input();
    public name: InputSignal<string> = input();
    public required: InputSignal<boolean> = input();
    public autocomplete: InputSignal<string> = input();
    public type: InputSignal<'number' | 'text' | 'search' | 'password' | 'email'> = input('text');
    public suffixName: InputSignal<IconsName> = input();

    public onSuffixClick: OutputEmitterRef<void> = output();

    public emitSuffixClick(): void {
        this.onSuffixClick.emit();
    }
}
