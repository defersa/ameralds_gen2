import { Component, DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { ApiAdminProducer } from '@am-front/root/api-v2';
import { AdminCartService } from '@am-front/services/cart/sources/admin-cart.service';
import { SnackService } from '@am-front/services/snackbar.service';
import { finalize } from 'rxjs';
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
    private readonly adminProducer: ApiAdminProducer = inject(ApiAdminProducer);
    private readonly adminCartService: AdminCartService = inject(AdminCartService);
    private readonly snackService: SnackService = inject(SnackService);
    private readonly router: Router = inject(Router);
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    public readonly isCreating: WritableSignal<boolean> = signal(false);
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
        if (this.isCreating()) {
            return;
        }

        this.adminOrderForm().markAsTouched();

        if (!this.adminOrderForm().valid()) {
            this.snackService.warn('Проверьте данные формы');

            return;
        }

        this.isCreating.set(true);

        const { email, vk } = this.adminOrderValues();

        this.adminProducer.adminCartControllerCompleteOrder({
            email: email.trim(),
            vk: vk.trim(),
        })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.isCreating.set(false)),
            )
            .subscribe({
                next: () => {
                    this.adminCartService.getActualAdminCart();
                    this.snackService.open('Заказ успешно создан');
                    void this.router.navigate(['/admin', 'orders', 'list']);
                },
                error: () => {
                    this.snackService.warn('Не удалось создать заказ. Попробуйте ещё раз');
                },
            });
    }
}
