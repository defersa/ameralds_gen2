import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountComponent } from './account.component';
import { CartComponent } from '@am/root/layouts/account/pages/cart/cart.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { PatternsComponent } from './pages/patterns/patterns.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AMSTORE_SECTION_CONFIG } from "@am/shared/menu/menu.component";
import { accountConfig } from "@am/root/layouts/account/section.config";
import { PatternRoutes } from "@am/shared/pages/pattern/pattern.routes";


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
            path: 'cart',
            children: [
                {
                    path: 'pattern',
                    children: PatternRoutes,
                },
                {
                    path: '',
                    component: CartComponent,
                }
            ]
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
