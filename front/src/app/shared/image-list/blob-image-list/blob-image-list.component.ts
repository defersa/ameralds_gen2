import { Component, Input } from '@angular/core';
import { IIndexedBlob, IIndexedImage, ImageModelSmall } from "@am/interface/image.interface";
import { AmstoreViewerService } from "@am/shared/viewer/viewer.service";
import { OutsideSrcDirective } from "@am/shared/outside-src/outside-src.directive";


// TODO: Неправильные размеры при измнении позиции
@Component({
    selector: "amstore-blob-image-list",
    templateUrl: "./blob-image-list.component.html",
    styleUrls: ["./../image-list.component.scss"],
    standalone: true,
    imports: [
        OutsideSrcDirective
    ]
})
export class BlobImageListComponent {
    @Input()
    public savedImages: IIndexedImage[] = [];

    @Input()
    public blobImages: IIndexedBlob[] = [];

    constructor(protected viewer: AmstoreViewerService) { }

    public openViewer(images: ImageModelSmall[], index: number): void {
        this.viewer.openImageViewer(images, index);
    }
}
