import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreAdminComponent } from './admin.component';
import { RouterModule, Routes } from "@angular/router";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { AmstoreSharedModule } from "@am/shared/shared.module";
import { MenuModule } from "@am/shared/menu/menu.module";
import { AMSTORE_SECTION_CONFIG } from "@am/shared/menu/menu.component";
import { adminConfig } from "@am/root/layouts/admin/section.config";


export const routes: Routes = [{
    path: '',
    component: AmstoreAdminComponent,
    children: [
        {
            path: '',
            redirectTo: 'patterns',
            pathMatch: "full",
        },
        {
            path: 'patterns',
            loadChildren: () => import('./modules/patterns/patterns.module').then(m => m.PatternsModule),
        },
        {
            path: 'sizes',
            loadChildren: () => import('./modules/sizes/sizes.module').then(m => m.SizesModule),
        },
        {
            path: 'categories',
            loadChildren: () => import('./modules/categories/categories.module').then(m => m.CategoriesModule),
        },
        {
            path: 'orders',
            loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule),
        },
    ]
}];


@NgModule({
    declarations: [
        AmstoreAdminComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        AmstoreCdkModule,
        AmstoreSharedModule,
        MenuModule,
    ],
    providers: [
        { provide: AMSTORE_SECTION_CONFIG, useValue: adminConfig},
    ]
})
export class AdminModule {
}
