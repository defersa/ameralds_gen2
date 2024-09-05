import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreCdkModule } from "@am/cdk/cdk.module";

import { AmstoreFilterComponent } from './filter.component';


@NgModule({
    declarations: [AmstoreFilterComponent],
    exports: [AmstoreFilterComponent],
    imports: [
        CommonModule,
        AmstoreCdkModule
    ]
})
export class AmstoreFilterModule {
}
