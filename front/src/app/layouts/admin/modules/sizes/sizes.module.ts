import { NgModule } from "@angular/core";

import { SizeEditComponent } from "./size-edit/size-edit.component";
import { SizesComponent } from "./sizes/sizes.component";
import { RouterModule, Routes } from "@angular/router";


const routes: Routes = [
    {
        path: '',
        component: SizesComponent,
    }, {
        path: 'create',
        component: SizeEditComponent,
    }, {
        path: 'edit/:id',
        component: SizeEditComponent,
    }];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export class SizesModule {

}
