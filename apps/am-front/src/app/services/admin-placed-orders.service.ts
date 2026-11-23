import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, type Observable, throwError } from 'rxjs';
import {
    ApiAdminPlacedOrdersProducer,
    type AdminPlacedOrderDetailsDto,
    type AdminPlacedOrdersPageDto,
} from '@am-front/root/api-v2';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';


export interface AdminPlacedOrdersFilters {
    page: number;
    pageSize: number;
    statuses?: string;
    user?: string;
    from?: string;
    to?: string;
}

export type PlacedOrderAction = 'cancel' | 'refund';

@Injectable({ providedIn: 'root' })
export class AdminPlacedOrdersService {
    private readonly api = inject(ApiAdminPlacedOrdersProducer);
    private readonly auth = inject(AuthService);
    private readonly profile = inject(ProfileService);

    /** Загружает страницу оформленных заказов; границы from/to — календарные дни UTC включительно. */
    public list(filters: AdminPlacedOrdersFilters): Observable<AdminPlacedOrdersPageDto> {
        return this.asAdmin(() =>
            this.api.adminPlacedOrdersControllerList(
                filters.page,
                filters.pageSize,
                filters.statuses,
                filters.user,
                filters.from,
                filters.to,
            ),
        );
    }

    /** Загружает безопасные подробности, включая финансовые операции и предварительную доступность действий. */
    public details(id: number): Observable<AdminPlacedOrderDetailsDto> {
        return this.asAdmin(() => this.api.adminPlacedOrdersControllerDetails(id));
    }

    /** Отправляет только причину действия; сумму, состав, статус и администратора определяет сервер. */
    public act(id: number, action: PlacedOrderAction, reason: string): Observable<AdminPlacedOrderDetailsDto> {
        return this.asAdmin(() =>
            action === 'cancel'
                ? this.api.adminPlacedOrdersControllerCancel(id, { reason })
                : this.api.adminPlacedOrdersControllerRefund(id, { reason }),
        );
    }

    /** Проверяет актуальные сигналы в момент подписки; без авторизации или роли ADMIN HTTP-запрос не отправляется. */
    private asAdmin<T>(request: () => Observable<T>): Observable<T> {
        return defer(() => {
            if (!this.auth.auth() || !this.profile.isAdmin()) {
                return throwError(
                    () =>
                        new HttpErrorResponse({
                            status: this.auth.auth() ? 403 : 401,
                        }),
                );
            }

            return request();
        });
    }
}
