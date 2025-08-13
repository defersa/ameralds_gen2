import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { CategoriesComponent } from "./categories/categories.component";
import { CategoryEditComponent } from "./category-edit/category-edit.component";


const routes: Routes = [
    {
        path: '',
        component: CategoriesComponent,
    }, {
        path: 'create',
        component: CategoryEditComponent,
    }, {
        path: 'edit/:id',
        component: CategoryEditComponent,
    }];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export class CategoriesModule {

}
