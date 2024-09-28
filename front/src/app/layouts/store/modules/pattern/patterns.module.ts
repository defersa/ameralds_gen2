import { NgModule } from "@angular/core";
import { PatternsComponent } from "./patterns/patterns.component";
import { PatternCardComponent } from "./pattern-card/pattern-card.component";
import { RouterModule, Routes } from "@angular/router";


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
    imports: [
        RouterModule.forChild(routes),
    ],
})
export class PatternsStoreModule {

}
