import { Directive, HostBinding } from '@angular/core';
import { ImageModelSmall } from 'src/app/interface/image.interface';
import { AmstoreViewerService } from '@am/shared/viewer/viewer.service';

@Directive({
    selector: '[amstoreCard]'
})
export class AmstoreCardDirective {
    @HostBinding('class')
    public classes: string = 'amstore-card';


    constructor(protected viewer: AmstoreViewerService) { }

    public openViewer(images: ImageModelSmall[], index: number): void {
        this.viewer.openImageViewer(images, index);
    }
}
