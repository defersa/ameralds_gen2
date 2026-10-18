import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiAdminProducer, AdminOrderDetailsDto, AdminOrdersPaginatedPageDto } from '@am-front/root/api-v2';


@Injectable({
    providedIn: 'root',
})
export class AdminOrdersService {
    private readonly adminProducer: ApiAdminProducer = inject(ApiAdminProducer);

    public getOrder(id: number): Observable<AdminOrderDetailsDto> {
        return this.adminProducer.adminCartControllerGetAdminOrderById(id);
    }

    public getOrders(
        page: number,
        email?: string,
        vk?: string,
        startDate?: Date | null,
        endDate?: Date | null,
    ): Observable<AdminOrdersPaginatedPageDto> {
        return this.adminProducer.adminCartControllerPage(
            page,
            email?.trim() || undefined,
            vk?.trim() || undefined,
            this.getDateBoundary(startDate, false),
            this.getDateBoundary(endDate, true),
        );
    }

    private getDateBoundary(value: Date | null | undefined, endOfDay: boolean): Date | undefined {
        if (!value) {
            return undefined;
        }

        const date = new Date(value);

        if (endOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }

        return date;
    }
}
