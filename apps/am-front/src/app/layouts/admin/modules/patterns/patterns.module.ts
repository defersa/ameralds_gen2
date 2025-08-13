import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { PatternsComponent } from "./index/patterns.component";
import { PatternRoutes } from "@am-front/shared/pages/pattern/pattern.routes";


const routes: Routes = [
    {
        path: '',
        component: PatternsComponent,
    },
    ...PatternRoutes,
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ]
})
export class PatternsModule {

}
