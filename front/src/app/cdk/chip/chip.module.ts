import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreChipComponent } from './chip.component';



@NgModule({
    declarations: [AmstoreChipComponent],
    imports: [
        CommonModule
    ],
    exports: [
        AmstoreChipComponent]
})
export class AmstoreChipModule { }
