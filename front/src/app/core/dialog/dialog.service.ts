import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ComponentType } from "@angular/cdk/portal";
import { AmstoreDefaultDialogComponent } from "./default/default.component";

@Injectable({
    providedIn: 'root'
})
export class DialogService {

    constructor(private _dialog: MatDialog) {

    }

    public openDialog<T = any>(config: MatDialogConfig<T>): void {
        const panelClass: string[] = Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass || ''];
        this._dialog.open(AmstoreDefaultDialogComponent, {
            minWidth: '400px',
            ...config,
            panelClass: ["amstore-dialog-login-panel", ...panelClass]
        });
    }

    public openCustomDialog<T = any>(component: ComponentType<T>, config: MatDialogConfig<T>): void {
        const panelClass: string[] = Array.isArray(config.panelClass) ? config.panelClass : [config.panelClass || ''];
        this._dialog.open<T>(component, {
            minWidth: '400px',
            ...config,
            panelClass: ["amstore-dialog-login-panel", ...panelClass]
        });
    }
}
