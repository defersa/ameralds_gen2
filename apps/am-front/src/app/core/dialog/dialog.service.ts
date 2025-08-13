import { inject, Injectable } from "@angular/core";
import { ComponentType } from "@angular/cdk/portal";
import { AmstoreInfoDialogComponent } from "./default/info-dialog.component";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { AmstoreConfirmDialogComponent } from "@am-front/core/dialog/confirm-dialog/confirm-dialog.component";


@Injectable({
    providedIn: 'root'
})
export class DialogService {
    public dialog: MatDialog = inject(MatDialog);

    public openInfoDialog<T = any>(config: MatDialogConfig<T>): MatDialogRef<AmstoreInfoDialogComponent> {
        const panelClass: string[] = Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass || ''];

        return this.dialog.open(AmstoreInfoDialogComponent, {
            minWidth: '400px',
            ...config,
            panelClass: ["amstore-dialog-login-panel", ...panelClass]
        });
    }

    public openConfirmDialog<T = any>(config: MatDialogConfig<T>): MatDialogRef<AmstoreConfirmDialogComponent> {
        const panelClass: string[] = Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass || ''];

        return this.dialog.open(AmstoreConfirmDialogComponent, {
            minWidth: '400px',
            ...config,
            panelClass: ["amstore-dialog-login-panel", ...panelClass]
        });
    }

    public test(): void {
        this.dialog.open(AmstoreConfirmDialogComponent);
    }

    public openCustomDialog<T = any>(component: ComponentType<T>, config: MatDialogConfig<T>): void {
        const panelClass: string[] = Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass || ''];

        this.dialog.open<T>(component, {
            minWidth: '400px',
            ...config,
            panelClass: ["amstore-dialog-login-panel", ...panelClass]
        });
    }
}
