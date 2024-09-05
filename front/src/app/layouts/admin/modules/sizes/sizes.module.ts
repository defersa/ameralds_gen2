import { NgModule } from "@angular/core";

import { SizeEditComponent } from "./size-edit/size-edit.component";
import { SizesComponent } from "./sizes/sizes.component";
import { RouterModule, Routes } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { AmstoreSharedModule } from "@am/shared/shared.module";


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
    declarations: [
        SizeEditComponent,
        SizesComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,

        AmstoreCdkModule,
        AmstoreSharedModule
    ],
})
export class SizesModule {

}
