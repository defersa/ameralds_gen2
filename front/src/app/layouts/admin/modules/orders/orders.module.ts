import { CartComponent } from "@am/root/layouts/admin/modules/orders/cart/cart.component";
import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { IndexComponent } from './index/index.component';
import { CardComponent } from './card/card.component';


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
    imports: [
        RouterModule.forChild(routes),
    ],
})
export class OrdersModule {

}
