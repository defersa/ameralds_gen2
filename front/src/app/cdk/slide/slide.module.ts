import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AmstoreSlideComponent } from './slide.component';



@NgModule({
    declarations: [AmstoreSlideComponent],
    imports: [
        CommonModule,
        MatSlideToggleModule,
        ReactiveFormsModule
    ],
    exports: [AmstoreSlideComponent]
})
export class AmstoreSlideModule { }
