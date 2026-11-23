import { MAX_PAGE_NUMBER } from '@ameralds/utils';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { invalidOrder } from '@am-back/db/service/order/errors/order-validation';
import type { AdminPlacedOrderFilters } from '@am-back/db/service/order/types/admin-placed-order-filters';
import { Injectable, type PipeTransform } from '@nestjs/common';


@Injectable()
export class AdminPlacedOrdersQueryPipe implements PipeTransform<Record<string, unknown>, AdminPlacedOrderFilters> {
    /** Валидирует пагинацию, несколько статусов, поиск пользователя и календарные дни UTC включительно. */
    public transform(query: Record<string, unknown>): AdminPlacedOrderFilters {
        const allowed = ['page', 'pageSize', 'statuses', 'user', 'from', 'to'];

        if (Object.keys(query)
            .some((key) => !allowed
            .includes(key))) {
            invalidOrder();
        }

        const filters: AdminPlacedOrderFilters = {
            page: this.integer(query['page'], 1, MAX_PAGE_NUMBER),
            pageSize: this.integer(query['pageSize'], 20, 100),
            createdFrom: this.day(query['from'], false),
            createdBefore: this.day(query['to'], true),
        };

        if (query['statuses'] !== undefined) {
            if (typeof query['statuses'] !== 'string') {
                invalidOrder();
            }

            const values = query['statuses'].split(',');
            const allowed = Object.values(OrderStatus)
                .filter((status) => status !== OrderStatus.OPEN);

            if (
                !values.length ||
                values.length > allowed.length ||
                values
                    .some((value) => !allowed
                    .some((status) => status === value))
            ) {
                invalidOrder();
            }

            filters.statuses = allowed
                .filter((status) => values
                .includes(status));
        }

        if (query['user'] !== undefined) {
            if (typeof query['user'] !== 'string' || !query['user'].trim() || query['user'].length > 254) {
                invalidOrder();
            }

            filters.user = query['user'].trim();
        }

        if (filters.createdFrom && filters.createdBefore && filters.createdFrom >= filters.createdBefore) {
            invalidOrder();
        }

        return filters;
    }

    /** Принимает только положительное целое число в разрешённом диапазоне, без массивов и дробей. */
    private integer(value: unknown, fallback: number, maximum: number): number {
        if (value === undefined) {
            return fallback;
        }

        if (typeof value !== 'string' || !/^\d+$/.test(value)) {
            invalidOrder();
        }

        const result = Number(value);

        if (!Number.isSafeInteger(result) || result < 1 || result > maximum) {
            invalidOrder();
        }

        return result;
    }

    /** Проверяет существующий календарный день; верхнюю границу переносит на начало следующего дня UTC. */
    private day(value: unknown, exclusiveEnd: boolean): string | undefined {
        if (value === undefined) {
            return undefined;
        }

        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            invalidOrder();
        }

        const date = new Date(`${value}T00:00:00.000Z`);

        if (
            !Number.isFinite(date.getTime()) ||
            date.toISOString().slice(0, 10) !== value ||
            value < '0001-01-01' ||
            value > '9998-12-31'
        ) {
            invalidOrder();
        }

        if (exclusiveEnd) {
            date.setUTCDate(date.getUTCDate() + 1);
        }

        return date.toISOString();
    }
}
