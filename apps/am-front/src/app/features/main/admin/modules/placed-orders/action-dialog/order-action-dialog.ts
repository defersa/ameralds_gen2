import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { disabled, form, FormField, maxLength, required, validate } from '@angular/forms/signals';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogState,
    MatDialogTitle,
} from '@angular/material/dialog';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { type AdminPlacedOrderDetailsDto } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService, type PlacedOrderAction } from '@am-front/services/admin-placed-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


export interface OrderActionDialogData {
    order: AdminPlacedOrderDetailsDto;
    action: PlacedOrderAction;
}

interface ActionModel {
    reason: string;
}

@Component({
    selector: 'amstore-order-action-dialog',
    templateUrl: './order-action-dialog.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe,
        FormField,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        AmstoreInputSignalComponent,
        AmstoreButtonComponent,
    ],
})
export class OrderActionDialog {
    private readonly service = inject(AdminPlacedOrdersService);
    private readonly auth = inject(AuthService);
    private readonly profile = inject(ProfileService);
    private readonly dialogRef = inject(MatDialogRef<OrderActionDialog, AdminPlacedOrderDetailsDto>);

    public readonly data = inject<OrderActionDialogData>(MAT_DIALOG_DATA);
    public readonly access = computed(() => this.auth.auth() && this.profile.isAdmin());
    public readonly request = createRequestWrapper<typeof this.service.act>(this.service.act.bind(this.service));
    public readonly model = signal<ActionModel>({ reason: '' });

    public readonly actionForm = form(this.model, (path) => {
        required(path.reason);
        maxLength(path.reason, 2000);
        validate(path.reason, (context) => context.value().length > 0 && !context.value().trim() ? { kind: 'required' } : null);
        disabled(path.reason, {
            when: () => this.request.loading() || !this.access(),
        });
    });

    /** Закрывает диалог при потере доступа и разрешает закрытие после ошибки; во время отправки защищает Escape/backdrop. */
    constructor() {
        effect(() => {
            this.dialogRef.disableClose = this.request.status() === 'loading';

            if (!this.access()) {
                this.dialogRef.close();
            }
        });
    }

    /** Отправляет обязательную причину один раз; не считает принятый возврат подтверждённым и возвращает серверное состояние родителю. */
    public submit(event: Event): void {
        event.preventDefault();
        this.actionForm.reason().markAsTouched();

        if (
            this.dialogRef.getState() !== MatDialogState.OPEN ||
            !this.access() ||
            this.request.loading() ||
            this.actionForm().invalid()
        ) {
            return;
        }

        this.dialogRef.disableClose = true;
        this.request
            .request(this.data.order.id, this.data.action, this.model().reason.trim())
            .subscribe((order) => this.dialogRef.close(order));
    }

    /** Закрывает подтверждение без действия, если отправка ещё не началась. */
    public close(): void {
        if (!this.request.loading()) {
            this.dialogRef.close();
        }
    }
}
