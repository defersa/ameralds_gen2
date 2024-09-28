import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountComponent } from './account.component';
import { GoodsComponent } from './pages/goods/goods.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { PatternsComponent } from './pages/patterns/patterns.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AMSTORE_SECTION_CONFIG } from "@am/shared/menu/menu.component";
import { accountConfig } from "@am/root/layouts/account/section.config";


export const routes: Routes = [{
    path: '', component: AccountComponent, children: [
        {
            path: '',
            redirectTo: 'profile',
            pathMatch: "full",
        },
        {
            path: 'profile',
            component: ProfileComponent,
        },
        {
            path: 'goods',
            component: GoodsComponent,
        },
        {
            path: 'orders',
            component: OrdersComponent,
        },
        {
            path: 'patterns',
            component: PatternsComponent,
        },
    ]
}]


@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
    providers: [
        { provide: AMSTORE_SECTION_CONFIG, useValue: accountConfig},
    ]
})
export class AccountModule { }
