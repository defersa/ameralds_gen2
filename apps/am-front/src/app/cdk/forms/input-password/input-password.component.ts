import { ChangeDetectionStrategy, Component, input, InputSignal, model, ModelSignal } from "@angular/core";
import { AmstoreFormsBaseDirective } from '../forms.abstract.directive';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import { ReactiveFormsModule } from "@angular/forms";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { AsyncPipe } from "@angular/common";
import { ErrorsPipe } from "@am-front/cdk/forms/errors/errors.pipe";


@Component({
    selector: "amstore-forms-input-password",
    templateUrl: "./input-password.component.html",
    styleUrls: ["./input-password.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatInput,
        ReactiveFormsModule,
        IconsComponent,
        AsyncPipe,
        ErrorsPipe
    ]
})
export class AmstoreInputPasswordComponent extends AmstoreFormsBaseDirective {
    public override label: InputSignal<string> = input();
    public name: InputSignal<string> = input();
    public required: InputSignal<boolean> = input();
    public autocomplete: InputSignal<string> = input();
    public type: ModelSignal<'text' | 'password'> = model('text')

    public switchType(): void {
        this.type.set(this.type() === 'password' ? 'text' : 'password');
    }
}
