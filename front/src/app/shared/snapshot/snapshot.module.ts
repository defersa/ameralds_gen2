import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AmstoreChipModule } from '@am/cdk/chip/chip.module';

import { AmstoreSnapshotBaseDirective } from './snapshot.base.directive';
import { AmstoreSnapshotPatternComponent } from './pattern/pattern.component';
import { AmstoreIconModule } from '@am/cdk/icons/icons.module';
import { AmstoreButtonDefaultModule } from '@am/cdk/buttons/default/default.module';
import { AmstoreInfoModule } from '@am/cdk/info/info.module';
import { AmstoreSlideModule } from '@am/cdk/slide/slide.module';
import { RouterModule } from "@angular/router";
import { OutsideSrcModule } from "@am/shared/outside-src/outside-src.module";
import { LangHandlerModule } from "@am/shared/lang-text/lang-handler.module";



@NgModule({
    declarations: [AmstoreSnapshotBaseDirective, AmstoreSnapshotPatternComponent],
    imports: [
        CommonModule,
        AmstoreChipModule,
        AmstoreIconModule,
        AmstoreButtonDefaultModule,
        AmstoreInfoModule,
        AmstoreSlideModule,
        RouterModule,
        OutsideSrcModule,
        LangHandlerModule,
    ],
    exports: [
        AmstoreSnapshotPatternComponent
    ]
})
export class AmstoreSnapshotModule { }
