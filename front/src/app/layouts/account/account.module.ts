import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AmstoreCdkModule } from '@am/cdk/cdk.module';
import { AmstoreCardModule } from "@am/shared/card/card.module";

import { AccountComponent } from './account.component';
import { GoodsComponent } from './pages/goods/goods.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { PatternsComponent } from './pages/patterns/patterns.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AMSTORE_SECTION_CONFIG } from "@am/shared/menu/menu.component";
import { accountConfig } from "@am/root/layouts/account/section.config";
import { MenuModule } from "@am/shared/menu/menu.module";


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
    declarations: [
        AccountComponent,
        GoodsComponent,
        OrdersComponent,
        PatternsComponent,
        ProfileComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        AmstoreCdkModule,
        AmstoreCardModule,

        MenuModule,
    ],
    providers: [
        { provide: AMSTORE_SECTION_CONFIG, useValue: accountConfig},
    ]
})
export class AccountModule { }
