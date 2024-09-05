import { CartComponent } from "@am/root/layouts/admin/modules/orders/cart/cart.component";
import { RouterModule, Routes } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AmstoreCdkModule } from "@am/cdk/cdk.module";
import { AmstoreSharedModule } from "@am/shared/shared.module";
import { PatternActionsModule } from "@am/shared/actions/pattern/pattern-actions.module";
import { NgModule } from "@angular/core";
import { IndexComponent } from './index/index.component';
import { ImageListModule } from "@am/shared/image-list/image-list.module";
import { SnapshotAdminOrderModule } from "@am/shared/snapshot/admin-order/snapshot-admin-order.module";
import { LangHandlerModule } from "@am/shared/lang-text/lang-handler.module";
import { CardComponent } from './card/card.component';
import { AmstoreInfoModule } from "@am/cdk/info/info.module";
import { OrdersFilterModule } from "@am/shared/filters/orders/orders-filter.module";


const routes: Routes = [
    {
        path: 'cart',
        component: CartComponent,
    },
    {
        path: 'list',
        component: IndexComponent,
    },
    {
        path: 'card/:id',
        component: CardComponent,
    },
];

@NgModule({
    declarations: [
        CartComponent,
        IndexComponent,
        CardComponent,
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,

        AmstoreCdkModule,
        AmstoreSharedModule,
        PatternActionsModule,
        ImageListModule,
        SnapshotAdminOrderModule,
        LangHandlerModule,
        AmstoreInfoModule,
        OrdersFilterModule,
    ],
})
export class OrdersModule {

}
