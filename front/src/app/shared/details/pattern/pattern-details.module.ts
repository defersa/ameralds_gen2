import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShortPatternDetailsComponent } from './short/short.component';
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { LangHandlerModule } from "@am/shared/lang-text/lang-handler.module";
import { RouterModule } from "@angular/router";


@NgModule({
    declarations: [
        ShortPatternDetailsComponent
    ],
    exports: [
        ShortPatternDetailsComponent
    ],
    imports: [
        CommonModule,
        AmstoreCdkModule,
        LangHandlerModule,
        RouterModule,
    ]
})
export class PatternDetailsModule {
}
