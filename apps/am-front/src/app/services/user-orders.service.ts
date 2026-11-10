import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ApiOrdersProducer, EnumOrderStatus, EnumPaymentStatus, PaymentAttemptDto, UserOrderDetailsDto, UserOrdersPageDto, UserOrderSummaryDto } from '@am-front/root/api-v2';
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
    private readonly document = inject(DOCUMENT);

    /** Загружает основные поля оформленных заказов владельца без состава и связей; без авторизации запрос не отправляется. Суммы задаются в копейках/центах. */
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

    /** Отменяет собственный ожидающий оплаты заказ; без авторизации или при некорректном ID запрос не отправляется. */
    public cancelOrder(id: number): Observable<UserOrderSummaryDto> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            if (!Number.isSafeInteger(id) || id < 1) {
                return throwError(() => new HttpErrorResponse({ status: 400 }));
            }

            return this.api.userOrdersControllerCancelOrder(id);
        });
    }

    /** Создаёт попытку с устойчивым UUID; сумму, владельца и адрес возврата определяет сервер. */
    public createPayment(id: number, idempotencyKey: string): Observable<PaymentAttemptDto> {
        return defer(() => {
            if (!this.auth.auth()) {
                return throwError(() => new HttpErrorResponse({ status: 401 }));
            }

            if (!Number.isSafeInteger(id) || id < 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
                return throwError(() => new HttpErrorResponse({ status: 400 }));
            }

            return this.api.paymentsControllerCreatePayment(id, { idempotencyKey });
        });
    }

    /** Перенаправляет только на безопасную ссылку незавершённой попытки; переход не меняет статус заказа. */
    public redirectToPayment(payment: PaymentAttemptDto): boolean {
        if (payment.status !== EnumPaymentStatus.PENDING || !payment.confirmationUrl || !this.auth.auth()) {
            return false;
        }

        let url: URL;

        try {
            url = new URL(payment.confirmationUrl);
        } catch {
            return false;
        }

        const sameOrigin = url.origin === this.document.location.origin;

        if (url.username || url.password || (url.protocol !== 'https:' && !(sameOrigin && url.protocol === 'http:'))) {
            return false;
        }

        this.document.location.assign(url.toString());

        return true;
    }
}
