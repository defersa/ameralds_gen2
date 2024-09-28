import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { PatternsComponent } from "./index/patterns.component";
import { PatternCardComponent } from "./card/pattern-card.component";
import { PatternEditComponent } from "./edit/pattern-edit.component";


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
    imports: [
        RouterModule.forChild(routes),
    ]
})
export class PatternsModule {

}
