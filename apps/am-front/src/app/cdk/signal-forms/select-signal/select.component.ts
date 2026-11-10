import { ChangeDetectionStrategy, Component, input, model, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { MatOption, MatSelect, MatSelectChange } from '@angular/material/select';
import { ErrorsPipe } from '@am-front/cdk/forms/errors/errors.pipe';
import type { SelectOption } from '@am-front/cdk/forms/forms.abstract.directive';
import { AmstoreSignalFormsBaseDirective } from '../forms.abstract.directive';


export type SelectSignalValue = SelectOption['value'] | SelectOption['value'][];

let nextSelectId = 0;

@Component({
    selector: 'amstore-select-signal',
    templateUrl: './select.component.html',
    styleUrls: ['../input-signal/input.component.scss', './select.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatSelect, MatOption, ErrorsPipe],
})
export class AmstoreSelectSignalComponent
    extends AmstoreSignalFormsBaseDirective<SelectSignalValue>
    implements FormValueControl<SelectSignalValue> {
    public readonly inputId = `amstore-select-signal-${nextSelectId++}`;
    public readonly labelId = `${this.inputId}-label`;
    public readonly messageId = `${this.inputId}-message`;
    public readonly value = model<SelectSignalValue>(null);
    public readonly items = input<SelectOption[]>([]);
    public readonly multiple = input(false);
    public readonly hint = input<string>();
    public readonly placeholder = input('');

    private readonly select = viewChild(MatSelect);

    /** Передаёт выбранное значение или массив в Signal Forms; disabled и readonly запрещают изменения. */
    public changeValue(event: MatSelectChange<SelectSignalValue>): void {
        if (this.disabled() || this.readonly()) {
            return;
        }

        this.value.set(event.value);
    }

    /** Переводит фокус на select при фокусировке поля через Signal Forms. */
    public focus(): void {
        this.select()?.focus();
    }
}
