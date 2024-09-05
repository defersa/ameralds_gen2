import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { AmstoreSharedModule } from "@am/shared/shared.module";
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
    declarations: [
        CategoryEditComponent,
        CategoriesComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,

        AmstoreCdkModule,
        AmstoreSharedModule
    ],
})
export class CategoriesModule {

}
