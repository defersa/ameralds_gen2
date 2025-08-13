import { Component, HostListener, inject, ViewEncapsulation } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { IconsComponent } from "@am-front/cdk/icons/icons.component";
import { ImageDto } from "@am-front/root/api";

@Component({
    selector: "asmtore-viewer",
    templateUrl: "./viewer-dialog.component.html",
    styleUrls: ["./viewer-dialog.component.scss"],
    // TODO: delete
    encapsulation: ViewEncapsulation.None,
    imports: [
        IconsComponent,
    ],
    host: {
        class: "amstore-viewer"
    }
})
export class AmstoreViewerDialogComponent {
    public data: { images: ImageDto[], index: number } = inject(MAT_DIALOG_DATA);
    private _dialogRef: MatDialogRef<unknown> = inject(MatDialogRef);

    public nextImage(event: MouseEvent): void {
        event.stopPropagation();
        this.data.index = this.data.index === this.data.images.length - 1 ? 0 : this.data.index + 1;
    }

    public prevImage(event: MouseEvent): void {
        event.stopPropagation();
        this.data.index = this.data.index === 0 ? this.data.images.length - 1 : this.data.index - 1;
    }

    public goToIndex(index: number, event: MouseEvent): void {
        event.stopPropagation();
        this.data.index = index;
    }

    @HostListener('click')
    protected _onClick(): void {
        this._dialogRef.close();
    }
}
