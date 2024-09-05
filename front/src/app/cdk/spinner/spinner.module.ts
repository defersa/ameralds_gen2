import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreSpinnerComponent } from './spinner.component';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";


@NgModule({
    declarations: [
        AmstoreSpinnerComponent
    ],
    exports: [
        AmstoreSpinnerComponent
    ],
    imports: [
        CommonModule,
        MatProgressSpinnerModule
    ]
})
export class AmstoreSpinnerModule {
}
