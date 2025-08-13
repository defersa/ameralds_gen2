import { NgModule } from "@angular/core";
import { PatternsComponent } from "./patterns/patterns.component";
import { RouterModule, Routes } from "@angular/router";
import { PatternRoutes } from "@am-front/shared/pages/pattern/pattern.routes";


export const routes: Routes = [
    {
        path: '',
        component: PatternsComponent,
    },
    ...PatternRoutes,
]

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export class PatternsStoreModule {

}
