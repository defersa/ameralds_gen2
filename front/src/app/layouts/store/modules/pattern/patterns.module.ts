import { NgModule } from "@angular/core";
import { PatternsComponent } from "./patterns/patterns.component";
import { PatternCardComponent } from "./pattern-card/pattern-card.component";
import { RouterModule, Routes } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { AmstoreSharedModule } from "@am/shared/shared.module";
import { PatternDetailsModule } from "@am/shared/details/pattern/pattern-details.module";
import { AmstoreFilterModule } from "@am/shared/filters/pattern/filter.module";


export const routes: Routes = [
    {
        path: '',
        component: PatternsComponent,
    },
    {
        path: ':id',
        component: PatternCardComponent,
    },
]

@NgModule({
    declarations: [
        PatternsComponent,
        PatternCardComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,

        AmstoreCdkModule,
        AmstoreSharedModule,
        PatternDetailsModule,
        AmstoreFilterModule,
    ],
})
export class PatternsStoreModule {

}
