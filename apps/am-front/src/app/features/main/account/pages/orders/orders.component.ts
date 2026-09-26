import { Component } from '@angular/core';
import { SmallOrders } from '@am-front/interface/order.interface';


@Component({
    selector: 'app-orders',
    templateUrl: './orders.component.html',
    styleUrls: ['./orders.component.scss'],
    standalone: true,
})
export class OrdersComponent {
    public page: number = 1;
    public pageCount: number = 1;
    public orders: SmallOrders[] = [];
}
