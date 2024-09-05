import { RouterModule, Routes } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { AmstoreSharedModule } from "@am/shared/shared.module";
import { NgModule } from "@angular/core";
import { PatternsComponent } from "./index/patterns.component";
import { PatternCardComponent } from "./card/pattern-card.component";
import { PatternEditComponent } from "./edit/pattern-edit.component";
import { PatternActionsModule } from "@am/shared/actions/pattern/pattern-actions.module";
import { PatternDetailsModule } from "@am/shared/details/pattern/pattern-details.module";
import { AmstoreFilterModule } from "@am/shared/filters/pattern/filter.module";


const routes: Routes = [
    {
        path: '',
        component: PatternsComponent,
    },
    {
        path: 'create',
        component: PatternEditComponent,
    },
    {
        path: ':id',
        component: PatternCardComponent
    },
    {
        path: ':id/edit',
        component: PatternEditComponent,
    },
];

@NgModule({
    declarations: [
        PatternsComponent,
        PatternCardComponent,
        PatternEditComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,

        AmstoreCdkModule,
        AmstoreSharedModule,
        PatternActionsModule,
        PatternDetailsModule,
        AmstoreFilterModule,
    ],
})
export class PatternsModule {

}
