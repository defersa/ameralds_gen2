import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageListComponent } from './image-list.component';
import { AmstoreViewerModule } from "@am/shared/viewer/viewer.module";
import { OutsideSrcModule } from "@am/shared/outside-src/outside-src.module";
import { BlobImageListComponent } from './blob-image-list/blob-image-list.component';


@NgModule({
    declarations: [
        ImageListComponent,
        BlobImageListComponent,
    ],
    exports: [
        ImageListComponent,
        BlobImageListComponent,
    ],
    imports: [
        CommonModule,
        AmstoreViewerModule,
        OutsideSrcModule,
    ]
})
export class ImageListModule {
}
