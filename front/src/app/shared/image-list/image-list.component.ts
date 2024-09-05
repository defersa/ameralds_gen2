import { Component, Input } from '@angular/core';
import { ImageModelSmall } from "@am/interface/image.interface";
import { AmstoreViewerService } from "@am/shared/viewer/viewer.service";


@Component({
    selector: 'amstore-image-list',
    templateUrl: './image-list.component.html',
    styleUrls: ['./image-list.component.scss']
})
export class ImageListComponent {
    @Input()
    public images: ImageModelSmall[];

    constructor(protected viewer: AmstoreViewerService) { }

    public openViewer(images: ImageModelSmall[], index: number): void {
        this.viewer.openImageViewer(images, index);
    }

}
