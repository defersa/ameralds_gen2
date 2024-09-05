import { Component, OnInit } from '@angular/core';
import { SmallOrders } from 'src/app/interface/order.interface';
import { OrdersService } from '../../services/orders.service';

@Component({
    selector: 'app-orders',
    templateUrl: './orders.component.html',
    styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {

    public page: number = 1;
    public pageCount: number = 1;
    public orders: SmallOrders[] = [];


    constructor(
        private ordersService: OrdersService
    ) { }

    public ngOnInit(): void {
    }

}
