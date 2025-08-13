import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstoreAdminComponent } from './admin.component';
import { RouterModule, Routes } from "@angular/router";
import { AMSTORE_SECTION_CONFIG } from "@am-front/shared/menu/menu.component";
import { adminConfig } from "@am-front/root/layouts/admin/section.config";


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
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
    ],
    providers: [
        { provide: AMSTORE_SECTION_CONFIG, useValue: adminConfig},
    ]
})
export class AdminModule {
}
