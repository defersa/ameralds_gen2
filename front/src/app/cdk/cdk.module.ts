import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AmstoreButtonRoundModule } from './buttons/round/round.module';
import { AmstoreIconModule } from './icons/icons.module';
import { AmstoreButtonDefaultModule } from './buttons/default/default.module';
import { AmstoreFormsModule } from './forms/forms.module';
import { AmstoreButtonMenuModule } from './buttons/menu/menu.module';
import { AmstorePaginatorModule } from './paginator/paginator.module';
import { AmstoreChipModule } from './chip/chip.module';
import { AmstoreInfoModule } from './info/info.module';
import { AmstoreSlideModule } from './slide/slide.module';
import { AmstorePanelModule } from "./panel/panel.module";
import { AmstoreDividerModule } from "./divider/divider.module";
import { AmstoreSpinnerModule } from "./spinner/spinner.module";



const CDK_MODULES: any[] = [
    AmstoreButtonRoundModule,
    AmstoreButtonMenuModule,
    AmstoreButtonDefaultModule,
    AmstoreIconModule,
    AmstoreFormsModule,
    AmstorePaginatorModule,
    AmstoreChipModule,
    AmstoreInfoModule,
    AmstoreSlideModule,
    AmstorePanelModule,
    AmstoreDividerModule,
    MatSnackBarModule,
    AmstoreSpinnerModule
]

@NgModule({
    imports: [
        CommonModule,
        ...CDK_MODULES
    ],
    exports: CDK_MODULES,
    declarations: []
})
export class AmstoreCdkModule {
}
