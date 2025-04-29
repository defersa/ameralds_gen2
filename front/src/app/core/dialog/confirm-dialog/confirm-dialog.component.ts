import { Component, inject } from "@angular/core";
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from "@angular/material/dialog";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";


@Component({
    selector: "amstore-default-dialog",
    templateUrl: "./confirm-dialog.component.html",
    styleUrls: ["./confirm-dialog.component.scss"],
    imports: [
        MatDialogTitle,
        AmstoreButtonComponent,
        MatDialogActions,
        MatDialogContent
    ]
})
export class AmstoreConfirmDialogComponent {
    public get title(): string {
        return this.data?.title || '';
    }

    public get smallTitle(): string {
        return this.data?.smallTitle || '';
    }

    public get text(): string {
        return this.data?.text || '';
    }

    public data: any = inject(MAT_DIALOG_DATA);
    private matDialogRef: MatDialogRef<AmstoreConfirmDialogComponent> = inject(MatDialogRef<AmstoreConfirmDialogComponent>);

    public close(result: boolean = false): void {
        this.matDialogRef.close(result);
    }
}
