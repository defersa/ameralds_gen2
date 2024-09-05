import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AmstoreButtonDefaultModule } from "@am/cdk/buttons/default/default.module";

import { AmstoreDefaultDialogComponent } from './default/default.component';


@NgModule({
    declarations: [
        AmstoreDefaultDialogComponent
    ],
    imports: [
        CommonModule,
        AmstoreButtonDefaultModule
    ]
})
export class DialogModule {
}
