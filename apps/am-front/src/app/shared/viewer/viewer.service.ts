import { inject, Injectable } from "@angular/core";
import { Observable } from 'rxjs';
import { MatDialog } from "@angular/material/dialog";
import { AmstoreViewerDialogComponent } from "@am-front/shared/viewer/viewer-dialog/viewer-dialog.component";
import { AmstoreImagesEditorComponent } from "@am-front/shared/viewer/images-editor/images-editor.component";
import { ImageDto } from "@am-front/root/api-v2";


@Injectable({
    providedIn: 'root'
})
export class AmstoreViewerService {
    private _dialog: MatDialog = inject(MatDialog);

    public openImageViewer(images: ImageDto[], index: number): Observable<any> {
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

    public openImagesEditor(images: ImageDto[]): Observable<ImageDto[]> {
        return this._dialog.open(AmstoreImagesEditorComponent, {
            data: {
                images,
            },
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            hasBackdrop: false
        }).afterClosed();
    }
}
