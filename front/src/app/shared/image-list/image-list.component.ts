import { Component, inject, input, InputSignal } from "@angular/core";
import { ImageModelSmall } from "@am/interface/image.interface";
import { AmstoreViewerService } from "@am/shared/viewer/viewer.service";
import { OutsideSrcDirective } from "@am/shared/outside-src/outside-src.directive";


@Component({
    selector: "amstore-image-list",
    templateUrl: "./image-list.component.html",
    styleUrls: ["./image-list.component.scss"],
    standalone: true,
    imports: [
        OutsideSrcDirective
    ]
})
export class ImageListComponent {
    public images: InputSignal<ImageModelSmall[]> = input();

    protected viewer: AmstoreViewerService = inject(AmstoreViewerService);

    public openViewer(images: ImageModelSmall[], index: number): void {
        this.viewer.openImageViewer(images, index);
    }
}
