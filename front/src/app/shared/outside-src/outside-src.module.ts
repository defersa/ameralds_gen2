import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OutsideSrcDirective } from './outside-src.directive';


@NgModule({
    declarations: [
        OutsideSrcDirective,
    ],
    exports: [
        OutsideSrcDirective,
    ],
    imports: [
        CommonModule,
    ]
})
export class OutsideSrcModule {
}
