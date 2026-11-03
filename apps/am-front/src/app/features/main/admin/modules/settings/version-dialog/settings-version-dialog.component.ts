import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { AmstoreButtonRoundComponent } from '@am-front/cdk/buttons/round/round.component';
import type { AppSettingsVersionDto } from '@am-front/root/api-v2';


@Component({
    selector: 'amstore-settings-version-dialog',
    templateUrl: './settings-version-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, MatDialogTitle, MatDialogContent, MatDialogActions, AmstoreButtonRoundComponent],
})
export class SettingsVersionDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<SettingsVersionDialogComponent>);
    public readonly version = inject<AppSettingsVersionDto>(MAT_DIALOG_DATA);

    public close(): void {
        this.dialogRef.close();
    }
}
