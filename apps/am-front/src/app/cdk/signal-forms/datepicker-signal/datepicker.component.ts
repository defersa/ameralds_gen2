import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    input,
    InputSignal,
    model,
    ModelSignal,
    viewChild,
} from '@angular/core';
import { FormValueControl, transformedValue } from '@angular/forms/signals';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { ErrorsPipe } from '@am-front/cdk/forms/errors/errors.pipe';
import { IconsComponent } from '@am-front/cdk/icons/icons.component';
import { AmstoreSignalFormsBaseDirective } from '../forms.abstract.directive';
import { DATEPICKER_SIGNAL_FORMATS, DatepickerSignalDateAdapter } from './datepicker-date-adapter';


type DatepickerInputValue = { date: Date | null; hasText: boolean };

let nextDatepickerId = 0;

@Component({
    selector: 'amstore-datepicker-signal',
    templateUrl: './datepicker.component.html',
    styleUrl: '../input-signal/input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        { provide: DateAdapter, useClass: DatepickerSignalDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATEPICKER_SIGNAL_FORMATS },
    ],
    imports: [
        MatDatepicker,
        MatDatepickerInput,
        IconsComponent,
        ErrorsPipe,
    ],
})
export class AmstoreDatepickerSignalComponent
    extends AmstoreSignalFormsBaseDirective<Date | null>
    implements FormValueControl<Date | null> {
    public readonly inputId = `amstore-datepicker-signal-${nextDatepickerId++}`;
    public readonly messageId = `${this.inputId}-message`;

    public readonly value: ModelSignal<Date | null> = model<Date | null>(null);

    public readonly hint: InputSignal<string | undefined> = input<string>();
    public readonly placeholder: InputSignal<string> = input('ДД.ММ.ГГГГ');
    public readonly min: InputSignal<Date | undefined> = input<Date>();
    public readonly max: InputSignal<Date | undefined> = input<Date>();

    private readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('dateInput');
    private readonly datepickerInput = viewChild(MatDatepickerInput<Date>);

    private readonly parsedValue = transformedValue<Date | null, DatepickerInputValue>(this.value, {
        parse: ({ date, hasText }) => !date && hasText
            ? { error: { kind: 'parse', message: 'Введите корректную дату в формате ДД.ММ.ГГГГ' } }
            : { value: date },
        format: (date) => ({ date, hasText: Boolean(date) }),
    });

    public changeValue(event: MatDatepickerInputEvent<Date>): void {
        if (this.disabled() || this.readonly()) {
            return;
        }

        this.parsedValue.set({
            date: event.value,
            hasText: Boolean((event.targetElement as HTMLInputElement).value.trim()),
        });
    }

    public focus(options?: FocusOptions): void {
        this.inputElement()?.nativeElement.focus(options);
    }

    public reset(): void {
        this.datepickerInput()?.writeValue(this.value());
    }
}
