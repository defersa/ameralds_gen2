import { Component, signal, WritableSignal } from '@angular/core';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import {
    email,
    type FieldTree,
    form,
    FormField,
    pattern,
    type ReadonlyFieldTree,
    type SchemaPathTree,
    validateTree
} from '@angular/forms/signals';


interface AdminOrderForm {
    email: string;
    vk: string;
}

const DEFAULT_FORM_VALUES: AdminOrderForm = {
    email: '',
    vk: '',
}

export type AdminOrderFormField = FieldTree<AdminOrderForm>;
export type AdminOrderFormState = SchemaPathTree<AdminOrderForm>;


@Component({
    selector: 'amstore-cart-action-admin',
    templateUrl: './action-admin.component.html',
    standalone: true,
    imports: [
        AmstoreButtonComponent,
        AmstoreInputSignalComponent,
        FormField
    ]
})
export class ActionAdminComponent {
    public readonly adminOrderValues: WritableSignal<AdminOrderForm> = signal(DEFAULT_FORM_VALUES);
    public readonly adminOrderForm: AdminOrderFormField = form<AdminOrderForm>(this.adminOrderValues, (formState: AdminOrderFormState) => {
        email(formState.email, {
            error: { kind: 'email' },
        });

        pattern(formState.vk, /^https:\/\/vk\.ru\/.*$/, {
            error: { kind: 'vkUrl' },
        });

        validateTree(formState, ({ value, fieldTreeOf }) => {
            const formValue: AdminOrderForm = value();
            const hasEmail: boolean = Boolean(formValue.email?.trim());
            const hasVk: boolean = Boolean(formValue.vk?.trim());

            return hasEmail || hasVk
                ? null
                : {
                    kind: 'contactRequired',
                    fieldTree: fieldTreeOf(formState.email) as unknown as ReadonlyFieldTree<unknown>,
                };
        });
    });


    public create(): void {
        this.adminOrderForm().markAsTouched();
    }
}
