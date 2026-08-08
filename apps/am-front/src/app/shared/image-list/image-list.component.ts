import { Component, inject, input, InputSignal } from "@angular/core";
import { AmstoreViewerService } from "@am-front/shared/viewer/viewer.service";
import type { ImageDto } from "@am-front/root/api-v2";


@Component({
    selector: "amstore-image-list",
    templateUrl: "./image-list.component.html",
    styleUrls: ["./image-list.component.scss"],
})
export class ImageListComponent {
    public images: InputSignal<ImageDto[]> = input();

    protected viewer: AmstoreViewerService = inject(AmstoreViewerService);

    public openViewer(images: ImageDto[], index: number): void {
        this.viewer.openImageViewer(images, index);
    }
}
