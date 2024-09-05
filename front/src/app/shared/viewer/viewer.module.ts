import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AmstoreIconModule } from '@am/cdk/icons/icons.module';
import { AmstoreButtonDefaultModule } from '@am/cdk/buttons/default/default.module';
import { AmstorePaginatorModule } from '@am/cdk/paginator/paginator.module';

import { AmstoreViewerComponent } from './viewer.component';
import { AmstoreImageListEditorComponent } from './image-list-editor/image-list-editor.component';
import { AmstoreViewerDialogComponent } from "@am/shared/viewer/viewer-dialog/viewer-dialog.component";
import { OutsideSrcModule } from "@am/shared/outside-src/outside-src.module";


@NgModule({
    declarations: [
        AmstoreViewerComponent,
        AmstoreImageListEditorComponent,
        AmstoreViewerDialogComponent
    ],
    imports: [
        CommonModule,
        AmstoreIconModule,
        AmstoreButtonDefaultModule,
        AmstorePaginatorModule,
        OutsideSrcModule,
    ]
})
export class AmstoreViewerModule {
}
