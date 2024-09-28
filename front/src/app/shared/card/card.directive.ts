import { Directive, HostBinding, inject } from "@angular/core";
import { ImageModelSmall } from 'src/app/interface/image.interface';
import { AmstoreViewerService } from '@am/shared/viewer/viewer.service';


@Directive({
    selector: '[amstoreCard]',
    standalone: true,
})
export class AmstoreCardDirective {
    @HostBinding('class')
    public classes: string = 'amstore-card';

    protected viewer: AmstoreViewerService = inject(AmstoreViewerService);

    public openViewer(images: ImageModelSmall[], index: number): void {
        this.viewer.openImageViewer(images, index);
    }
}
