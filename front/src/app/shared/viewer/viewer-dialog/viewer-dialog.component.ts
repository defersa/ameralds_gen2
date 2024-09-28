import { Component, HostListener, inject, Inject, OnInit, ViewEncapsulation } from "@angular/core";
import { ImageModelSmall } from 'src/app/interface/image.interface';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { IconsComponent } from "@am/cdk/icons/icons.component";
import { OutsideSrcDirective } from "@am/shared/outside-src/outside-src.directive";

@Component({
    selector: "asmtore-viewer",
    templateUrl: "./viewer-dialog.component.html",
    styleUrls: ["./viewer-dialog.component.scss"],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        IconsComponent,
        OutsideSrcDirective
    ],
    host: {
        class: "amstore-viewer"
    }
})
export class AmstoreViewerDialogComponent {
    public data: {images: ImageModelSmall[], index: number} = inject(MAT_DIALOG_DATA);
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
    private _onClick(): void {
        this._dialogRef.close();
    }
}
