import { ChangeDetectionStrategy, Component, input, InputSignal, model, ModelSignal, ViewEncapsulation } from "@angular/core";
import { MatCheckbox, MatCheckboxChange } from "@angular/material/checkbox";
import type { FormValueControl } from "@angular/forms/signals";
import { OptionType } from "@am-front/interface/cdk.interface";
import { AmstoreSignalFormsBaseDirective } from "../forms.abstract.directive";


@Component({
    selector: "amstore-checkbox-list-signal",
    templateUrl: "./checkbox-list.component.html",
    styleUrl: "./checkbox-list.component.scss",
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCheckbox
    ],
    host: {
        class: "amstore-checkbox-list-signal"
    }
})
export class AmstoreCheckboxListSignalComponent
    extends AmstoreSignalFormsBaseDirective<number[]>
    implements FormValueControl<number[]> {
    public readonly value: ModelSignal<number[]> = model<number[]>([]);
    public readonly items: InputSignal<OptionType[]> = input<OptionType[]>([]);

    public isChecked(item: OptionType): boolean {
        const value: number | null = this.getItemValue(item);

        return value !== null && this.value().includes(value);
    }

    public changeChecked(item: OptionType, event: MatCheckboxChange): void {
        const value: number | null = this.getItemValue(item);

        if (value === null) {
            return;
        }

        this.value.update((values: number[]) => this.getNextValue(values, value, event.checked));
        this.markAsTouched();
    }

    private getNextValue(values: number[], value: number, checked: boolean): number[] {
        const currentValues: number[] = values ?? [];

        if (checked) {
            return currentValues.includes(value) ? currentValues : [...currentValues, value];
        }

        return currentValues.filter((currentValue: number) => currentValue !== value);
    }

    private getItemValue(item: OptionType): number | null {
        const value = Number(item.value);

        return Number.isFinite(value) ? value : null;
    }
}
