import { Component, Inject } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from "@angular/material/legacy-dialog";

@Component({
    selector: 'amstore-default-dialog',
    templateUrl: './default.component.html',
    styleUrls: ['./default.component.scss']
})
export class AmstoreDefaultDialogComponent {
    public get title(): string {
        return this.data?.title || '';
    }
    public get smallTitle(): string {
        return this.data?.smallTitle || '';
    }
    public get text(): string {
        return this.data?.text || '';
    }

    constructor(
        private _matDialogRef: MatDialogRef<AmstoreDefaultDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    public close(): void {
        this._matDialogRef.close();
    }

}
