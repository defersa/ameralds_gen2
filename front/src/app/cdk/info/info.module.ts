import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreInfoComponent } from './info.component';
import { AmstoreIconModule } from '../icons/icons.module';



@NgModule({
    declarations: [AmstoreInfoComponent],
    imports: [
        CommonModule,
        AmstoreIconModule
    ],
    exports: [
        AmstoreInfoComponent
    ],
})
export class AmstoreInfoModule { }
