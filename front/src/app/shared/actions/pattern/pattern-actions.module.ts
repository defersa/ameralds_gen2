import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AmstoreCdkModule } from "@am/cdk/cdk.module";

import { AbstractPatternCard } from "@am/shared/actions/pattern/pattern.abstract";

import { PatternAdminComponent } from './pattern-admin/pattern-admin.component';
import { PatternCartComponent } from './pattern-cart/pattern-cart.component';
import { PatternDownloadComponent } from './pattern-download/pattern-download.component';
import { CartComponent } from './cart/cart.component';


@NgModule({
    declarations: [
        AbstractPatternCard,
        PatternAdminComponent,
        PatternCartComponent,
        PatternDownloadComponent,
        CartComponent,
    ],
    exports: [
        PatternAdminComponent,
        PatternCartComponent,
        PatternDownloadComponent,
        CartComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AmstoreCdkModule,
    ]
})
export class PatternActionsModule {
}
