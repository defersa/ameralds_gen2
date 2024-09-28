import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle } from "@angular/material/dialog";
import { AmstoreButtonComponent } from "@am/cdk/buttons/default/amstore-button.component";


@Component({
    selector: "amstore-default-dialog",
    templateUrl: "./default.component.html",
    styleUrls: ["./default.component.scss"],
    standalone: true,
    imports: [
        MatDialogTitle,
        AmstoreButtonComponent
    ]
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

    public data: any = inject(MAT_DIALOG_DATA);
    private matDialogRef: MatDialogRef<AmstoreDefaultDialogComponent> = inject(MatDialogRef<AmstoreDefaultDialogComponent>);

    public close(): void {
        this.matDialogRef.close();
    }
}
