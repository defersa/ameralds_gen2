import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AmstoreViewerComponent } from './viewer.component';
import {
    AmstoreImageListEditorComponent
} from "@am/shared/viewer/image-list-editor/image-list-editor.component";
import { AmstoreViewerDialogComponent } from "@am/shared/viewer/viewer-dialog/viewer-dialog.component";
import { IIndexedBlob, IIndexedImage } from "@am/interface/image.interface";


// TODO: Not for root
@Injectable({
    providedIn: 'root'
})
export class AmstoreViewerService {

    constructor(
        private _dialog: MatDialog) { }

    public open(images: unknown[], index: number): void {
        this._dialog.open(AmstoreViewerComponent, {
            data: {
                images,
                index
            },
            width: '80vw',
            hasBackdrop: true
        });
    }

    public openImageViewer(images: unknown[], index: number): Observable<any> {
        return this._dialog.open(AmstoreViewerDialogComponent, {
            data: {
                images,
                index
            },
            panelClass: 'amstore-viewer-backdrop',
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            hasBackdrop: false
        }).afterClosed();
    }

    public openImageEditor(currentImages: IIndexedImage[], blobImages: IIndexedBlob[]): Observable<any> {
        return this._dialog.open(AmstoreImageListEditorComponent, {
            data: {
                currentImages,
                blobImages
            },
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            hasBackdrop: false
        }).afterClosed();
    }
}
