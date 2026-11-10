import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiOrdersProducer, EnumOrderStatus, UserOrderDetailsDto, UserOrdersPageDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { defer, Observable, throwError } from 'rxjs';


export interface UserOrdersFilters {
    page: number;
    status?: EnumOrderStatus;
    createdFrom?: Date;
    createdBefore?: Date;
    minAmount?: number;
    maxAmount?: number;
}

@Injectable({ providedIn: 'root' })
export class UserOrdersService {
    private readonly api = inject(ApiOrdersProducer);
    private readonly auth = inject(AuthService);

    /** Загружает страницу оформленных заказов владельца; без авторизации запрос не отправляется. Суммы задаются в копейках/центах. */
    public getOrders(filters: UserOrdersFilters): Observable<UserOrdersPageDto> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            return this.api.userOrdersControllerGetOrders(
                filters.page, filters.status, filters.createdFrom, filters.createdBefore, filters.minAmount, filters.maxAmount,
            );
        });
    }

    /** Загружает оформленный заказ владельца, включая ожидающий оплаты; без авторизации запрос не отправляется. */
    public getOrder(id: number): Observable<UserOrderDetailsDto> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            if (!Number.isSafeInteger(id) || id < 1) {
                return throwError(() => new HttpErrorResponse({ status: 400 }));
            }

            return this.api.userOrdersControllerGetOrder(id);
        });
    }
}
