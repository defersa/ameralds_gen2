import { Directive, HostBinding, inject } from "@angular/core";
import { ImageModelSmall } from '../../interface/image.interface';
import { AmstoreViewerService } from "@am-front/shared/viewer/viewer.service";


@Directive({
    selector: '[amstoreCard]',
    standalone: true,
})
export class AmstoreCardDirective {
    @HostBinding('class')
    public classes: string = 'amstore-card';

    protected viewer: AmstoreViewerService = inject(AmstoreViewerService);

    public openViewer(images: ImageModelSmall[], index: number): void {
        // this.viewer.openImageViewer(images, index);
    }
}
