import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ImageModelSmall } from 'src/app/interface/image.interface';

@Component({
    selector: 'asmtore-viewer',
    templateUrl: './viewer.component.html',
    styleUrls: ['./viewer.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'amstore-viewer'
    }
})
export class AmstoreViewerComponent implements OnInit {

    constructor(@Inject(MAT_DIALOG_DATA) public data: {images: ImageModelSmall[], index: number}) { }

    ngOnInit(): void {
    }

    public nextImage(): void {
        this.data.index = this.data.index === this.data.images.length - 1 ? 0 : this.data.index + 1;
    }

    public prevImage(): void {
        this.data.index = this.data.index === 0 ? this.data.images.length - 1 : this.data.index - 1;
    }

}
