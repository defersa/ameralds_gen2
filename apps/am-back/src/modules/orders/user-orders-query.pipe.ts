import { MAX_PAGE_NUMBER } from '@ameralds/utils';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { invalidOrder } from '@am-back/db/service/order/errors/order-validation';
import type { UserOrderFilters } from '@am-back/db/service/order/types/user-order-filters';
import { Injectable, type PipeTransform } from '@nestjs/common';


@Injectable()
export class UserOrdersQueryPipe implements PipeTransform<Record<string, unknown>, UserOrderFilters> {
    /** Приводит query-параметры и проверяет границы; некорректный статус, дата или диапазон дают стандартную ошибку INVALID. */
    public transform(query: Record<string, unknown>): UserOrderFilters {
        const filters: UserOrderFilters = {
            page: this.number(query['page'], 1, MAX_PAGE_NUMBER) ?? 1,
            minAmount: this.number(query['minAmount'], 0, Number.MAX_SAFE_INTEGER),
            maxAmount: this.number(query['maxAmount'], 0, Number.MAX_SAFE_INTEGER),
            createdFrom: this.date(query['createdFrom']),
            createdBefore: this.date(query['createdBefore']),
        };

        if (query['status'] !== undefined) {
            const status = Object.values(OrderStatus)
                .find(value => value === query['status'] && value !== OrderStatus.OPEN);

            if (!status) {
                invalidOrder();
            }

            filters.status = status;
        }

        if ((filters.minAmount !== undefined && filters.maxAmount !== undefined && filters.minAmount > filters.maxAmount) ||
            (filters.createdFrom && filters.createdBefore && filters.createdFrom >= filters.createdBefore)) {
            invalidOrder();
        }

        return filters;
    }

    /** Читает необязательное целое число без пустых строк, массивов и выхода за безопасный диапазон. */
    private number(value: unknown, min: number, max: number): number | undefined {
        if (value === undefined) {
            return undefined;
        }

        if (typeof value !== 'string' || !/^\d+$/.test(value)) {
            invalidOrder();
        }

        const number = Number(value);

        if (!Number.isSafeInteger(number) || number < min || number > max) {
            invalidOrder();
        }

        return number;
    }

    /** Читает ISO-дату со временем и часовым поясом и нормализует её в UTC для сравнения границ. */
    private date(value: unknown): string | undefined {
        if (value === undefined) {
            return undefined;
        }

        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
            invalidOrder();
        }

        const calendarDate = value.slice(0, 10);

        if (new Date(`${calendarDate}T00:00:00Z`).toISOString().slice(0, 10) !== calendarDate) {
            invalidOrder();
        }

        return new Date(value).toISOString();
    }
}
