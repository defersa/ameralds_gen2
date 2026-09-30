import {
    ChangeDetectionStrategy,
    Component,
    input,
    InputSignal,
    model,
    ModelSignal,
    output,
    OutputEmitterRef
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import type { IconsName } from "@am-front/cdk/icons/icons.map";
import { AmstoreSignalFormsBaseDirective } from "../forms.abstract.directive";
import { ErrorsPipe } from "@am-front/cdk/forms/errors/errors.pipe";


export type InputSignalValue = string | number | null;
export type InputSignalType = 'number' | 'text' | 'search' | 'password' | 'email';

let nextInputId = 0;

@Component({
    selector: "amstore-input-signal",
    templateUrl: "./input.component.html",
    styleUrl: "./input.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        IconsComponent,
        ErrorsPipe
    ]
})
export class AmstoreInputSignalComponent
    extends AmstoreSignalFormsBaseDirective<InputSignalValue>
    implements FormValueControl<InputSignalValue> {
    public readonly inputId = `amstore-input-signal-${nextInputId++}`;
    public readonly messageId = `${this.inputId}-message`;

    public readonly value: ModelSignal<InputSignalValue> = model<InputSignalValue>(null);

    public readonly hint: InputSignal<string | undefined> = input<string>();
    public readonly autocomplete: InputSignal<string | undefined> = input<string>();
    public readonly type: InputSignal<InputSignalType> = input<InputSignalType>('text');
    public readonly suffixName: InputSignal<IconsName | undefined> = input<IconsName>();

    public readonly onSuffixClick: OutputEmitterRef<void> = output<void>();

    public changeValue(event: Event): void {
        const inputElement: HTMLInputElement = event.target as HTMLInputElement;

        this.value.set(this.getInputValue(inputElement));
    }

    public emitSuffixClick(): void {
        this.onSuffixClick.emit();
    }

    private getInputValue(inputElement: HTMLInputElement): InputSignalValue {
        if (this.type() !== 'number') {
            return inputElement.value;
        }

        return inputElement.value === '' ? null : inputElement.valueAsNumber;
    }
}
