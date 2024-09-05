import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LangTextComponent} from './lang-text.component';
import { LangNumberComponent } from "@am/shared/lang-text/lang-number.component";


@NgModule({
    declarations: [
        LangTextComponent,
        LangNumberComponent,
    ],
    exports: [
        LangTextComponent,
        LangNumberComponent,
    ],
    imports: [
        CommonModule,
    ]
})
export class LangHandlerModule {
}
