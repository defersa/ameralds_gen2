import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { disabled, form, FormField, max, min, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { AmstoreButtonRoundComponent } from '@am-front/cdk/buttons/round/round.component';
import { AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { type AppSettingsVersionDto } from '@am-front/root/api-v2';
import { AppSettingsService } from '@am-front/services/app-settings.service';
import { createRequestWrapper } from '@am-front/utils/request-wrapper';


interface SettingsFormModel {
    paymentExpirationDays: number | null;
}

@Component({
    selector: 'amstore-settings-create-dialog',
    templateUrl: './settings-create-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormField,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        AmstoreButtonRoundComponent,
        AmstoreInputSignalComponent,
    ],
})
export class SettingsCreateDialogComponent {
    private readonly settings = inject(AppSettingsService);
    private readonly initialVersion = inject<AppSettingsVersionDto>(MAT_DIALOG_DATA);
    private readonly dialogRef = inject(MatDialogRef<SettingsCreateDialogComponent, AppSettingsVersionDto>);

    public readonly createRequest =
        createRequestWrapper<typeof this.settings.create>(this.settings.create.bind(this.settings));

    public readonly current = signal(this.initialVersion);
    public readonly model = signal<SettingsFormModel>({ paymentExpirationDays: this.initialVersion.effective.orders.paymentExpirationDays });
    public readonly settingsForm = form(this.model, path => {
        required(path.paymentExpirationDays);
        min(path.paymentExpirationDays, 1);
        max(path.paymentExpirationDays, 365);
        disabled(path.paymentExpirationDays, { when: () => this.createRequest.loading() });
    });

    constructor() {
        effect(() => {
            if (this.createRequest.errors()) {
                this.dialogRef.disableClose = false;
            }
        });
    }

    public save(event?: Event): void {
        event?.preventDefault();

        this.settingsForm.paymentExpirationDays().markAsTouched();

        if (this.createRequest.loading() || this.settingsForm().invalid()) {
            return;
        }

        const paymentExpirationDays = this.model().paymentExpirationDays;

        this.dialogRef.disableClose = true;

        this.createRequest.request({
            expectedVersion: this.current().version, changes: { orders: { paymentExpirationDays } }
        }).subscribe((version: AppSettingsVersionDto) => {
            this.dialogRef.disableClose = false;
            this.dialogRef.close(version);
        });
    }

    public close(): void {
        this.dialogRef.close();
    }
}
