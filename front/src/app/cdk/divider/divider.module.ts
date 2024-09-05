import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreDividerComponent } from './divider.component';


@NgModule({
    declarations: [AmstoreDividerComponent],
    exports: [AmstoreDividerComponent],
    imports: [
        CommonModule
    ]
})
export class AmstoreDividerModule {
}
