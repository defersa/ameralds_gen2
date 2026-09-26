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
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import type { FormValueControl } from "@angular/forms/signals";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import type { IconsName } from "@am-front/cdk/icons/icons.map";
import { AmstoreSignalFormsBaseDirective } from "../forms.abstract.directive";


export type InputSignalValue = string | number | null;
export type InputSignalType = 'number' | 'text' | 'search' | 'password' | 'email';

@Component({
    selector: "amstore-input-signal",
    templateUrl: "./input.component.html",
    styleUrl: "./input.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatInput,
        IconsComponent
    ]
})
export class AmstoreInputSignalComponent
    extends AmstoreSignalFormsBaseDirective<InputSignalValue>
    implements FormValueControl<InputSignalValue> {
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
