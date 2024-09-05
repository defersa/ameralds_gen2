import {Component, HostListener, Inject, OnInit, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { ImageModelSmall } from 'src/app/interface/image.interface';

@Component({
    selector: 'asmtore-viewer',
    templateUrl: './viewer-dialog.component.html',
    styleUrls: ['./viewer-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-viewer'
    }
})
export class AmstoreViewerDialogComponent implements OnInit {

    constructor(@Inject(MAT_DIALOG_DATA) public data: {images: ImageModelSmall[], index: number},
                private _dialogRef: MatDialogRef<unknown>) { }

    ngOnInit(): void {
    }

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
