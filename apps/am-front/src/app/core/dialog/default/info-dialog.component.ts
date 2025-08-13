import { Component, inject } from "@angular/core";
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContainer, MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from "@angular/material/dialog";
import { AmstoreButtonComponent } from "@am-front/cdk/buttons/default/amstore-button.component";


@Component({
    selector: "amstore-default-dialog",
    templateUrl: "./info-dialog.component.html",
    styleUrls: ["./info-dialog.component.scss"],
    imports: [
        MatDialogTitle,
        AmstoreButtonComponent,
        MatDialogActions,
        MatDialogContent,
    ]
})
export class AmstoreInfoDialogComponent {
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
    private matDialogRef: MatDialogRef<AmstoreInfoDialogComponent> = inject(MatDialogRef<AmstoreInfoDialogComponent>);

    public close(): void {
        this.matDialogRef.close();
    }
}
