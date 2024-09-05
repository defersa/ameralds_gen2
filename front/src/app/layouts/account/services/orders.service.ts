import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OrdersRequest } from 'src/app/interface/order.interface';
import { getAction, HttpActions } from 'src/app/utils/action-builder';

@Injectable({
	providedIn: 'root'
})
export class OrdersService {

	constructor(
		private httpClient: HttpClient
	) { }

	public getOrders(page: number): Observable<OrdersRequest> {
		return this.httpClient.get<OrdersRequest>(getAction(HttpActions.GetOrders) + page);
	}
}
