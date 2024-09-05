import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstorePanelExpandComponent, AmstorePanelHeaderComponent } from './panel-expand/panel-expand.component';
import { AmstoreIconModule } from "@am/cdk/icons/icons.module";
import { AmstoreDividerModule } from "@am/cdk/divider/divider.module";
import { AmstorePanelBasicComponent } from './panel-basic/amstore-panel-basic.component';


@NgModule({
    declarations: [AmstorePanelExpandComponent, AmstorePanelHeaderComponent, AmstorePanelBasicComponent],
    exports: [AmstorePanelExpandComponent, AmstorePanelHeaderComponent, AmstorePanelBasicComponent],
    imports: [
        CommonModule,
        AmstoreIconModule,
        AmstoreDividerModule
    ]
})
export class AmstorePanelModule {
}
