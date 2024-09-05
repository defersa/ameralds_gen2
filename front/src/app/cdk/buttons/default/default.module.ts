import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultComponent } from './default.component';



@NgModule({
    declarations: [DefaultComponent],
    imports: [
        CommonModule
    ],
    exports: [
        DefaultComponent
    ]
})
export class AmstoreButtonDefaultModule { }
