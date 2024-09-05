import { NgModule, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreButtonDefaultModule } from '@am/cdk/buttons/default/default.module';
import { AmstoreIconModule } from '@am/cdk/icons/icons.module';
import { AmstoreChipModule } from '@am/cdk/chip/chip.module';
import { AmstoreSlideModule } from '@am/cdk/slide/slide.module';
import { AmstoreInfoModule } from '@am/cdk/info/info.module';
import { AmstoreFormsModule } from '@am/cdk/forms/forms.module';
import { AmstoreProfileCardComponent } from "@am/shared/card/profile/profile.component";
import { AmstorePanelModule } from "@am/cdk/panel/panel.module";

import { AmstoreCardDirective } from './card.directive';
import { AmstorePatternCardComponent } from './pattern/pattern.component';
import { AmstorePatternAddCardComponent } from './pattern-add/pattern-add.component';
import { ImageListModule } from "@am/shared/image-list/image-list.module";

const COMPONENTS:  Array<Type<any> | any[]> = [
    AmstorePatternCardComponent,
    AmstorePatternAddCardComponent,
    AmstoreProfileCardComponent
];


@NgModule({
    declarations: [AmstoreCardDirective, ...COMPONENTS],
    imports: [
        CommonModule,
        AmstoreButtonDefaultModule,
        AmstoreIconModule,
        AmstoreChipModule,
        AmstoreSlideModule,
        AmstoreInfoModule,
        AmstoreFormsModule,
        AmstorePanelModule,
        ImageListModule,
    ],
    exports: COMPONENTS
})
export class AmstoreCardModule { }
