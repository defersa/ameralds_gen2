import { Component, inject, Inject, OnInit, ViewEncapsulation } from "@angular/core";
import { ImageModelSmall } from 'src/app/interface/image.interface';
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { IconsComponent } from "@am/cdk/icons/icons.component";


@Component({
    selector: 'asmtore-viewer',
    templateUrl: './viewer.component.html',
    styleUrls: ['./viewer.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        IconsComponent
    ],
    host: {
        class: 'amstore-viewer'
    }
})
export class AmstoreViewerComponent {
    public data: {images: ImageModelSmall[], index: number } = inject(MAT_DIALOG_DATA);

    public nextImage(): void {
        this.data.index = this.data.index === this.data.images.length - 1 ? 0 : this.data.index + 1;
    }

    public prevImage(): void {
        this.data.index = this.data.index === 0 ? this.data.images.length - 1 : this.data.index - 1;
    }

}
