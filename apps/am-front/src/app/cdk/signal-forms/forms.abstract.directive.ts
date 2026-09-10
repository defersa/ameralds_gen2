import {
    computed,
    Directive,
    input,
    InputSignal,
    model,
    ModelSignal,
    output,
    OutputEmitterRef,
    Signal,
} from "@angular/core";
import {
    type DisabledReason,
    type FormCheckboxControl,
    type FormUiControl,
    type ValidationError,
    type WithOptionalFieldTree,
} from "@angular/forms/signals";
import { AmstoreColor } from "@am-front/cdk/core/color";


export type SignalFormLabel = string | number | null | undefined;
export type SignalFormError = WithOptionalFieldTree<ValidationError>;
export type SignalFormErrors = readonly SignalFormError[];
export type SignalFormDisabledReason = WithOptionalFieldTree<DisabledReason>;
export type SignalFormDisabledReasons = readonly SignalFormDisabledReason[];

@Directive()
export abstract class AmstoreSignalFormsBaseDirective<TValue> extends AmstoreColor implements FormUiControl<TValue> {
    public readonly label: InputSignal<SignalFormLabel> = input<SignalFormLabel>();

    public readonly errors: InputSignal<SignalFormErrors> = input<SignalFormErrors>([]);
    public readonly disabledReasons: InputSignal<SignalFormDisabledReasons> = input<SignalFormDisabledReasons>([]);

    public readonly disabled: InputSignal<boolean> = input(false);
    public readonly readonly: InputSignal<boolean> = input(false);
    public readonly hidden: InputSignal<boolean> = input(false);
    public readonly invalid: InputSignal<boolean> = input(false);
    public readonly pending: InputSignal<boolean> = input(false);
    public readonly touched: InputSignal<boolean> = input(false);
    public readonly dirty: InputSignal<boolean> = input(false);
    public readonly required: InputSignal<boolean> = input(false);

    public readonly name: InputSignal<string | undefined> = input<string>();

    public readonly touch: OutputEmitterRef<void> = output<void>();

    public readonly firstError: Signal<SignalFormError | null> = computed(() => this.errors()[0] ?? null);
    public readonly showErrors: Signal<boolean> = computed(() =>
        !this.disabled() && !this.hidden() && this.invalid() && (this.touched() || this.dirty()) && this.errors().length > 0
    );
    public readonly errorMessage: Signal<string | null> = computed(() => {
        const firstError: SignalFormError | null = this.firstError();

        return firstError ? this.getErrorMessage(firstError) : null;
    });

    public markAsTouched(): void {
        this.touch.emit();
    }

    protected getErrorMessage(error: SignalFormError): string {
        return error.message ?? `Has no template for error ${error.kind}`;
    }
}

@Directive()
export abstract class AmstoreSignalFormsCheckboxBaseDirective
    extends AmstoreSignalFormsBaseDirective<boolean>
    implements FormCheckboxControl {
    public readonly checked: ModelSignal<boolean> = model(false);
}
