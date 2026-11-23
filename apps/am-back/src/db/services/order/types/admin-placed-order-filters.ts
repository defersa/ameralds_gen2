import type { OrderStatus } from '@am-back/db/entities/purchases/order.entity';


export interface AdminPlacedOrderFilters {
    page: number;
    pageSize: number;
    statuses?: OrderStatus[];
    user?: string;
    createdFrom?: string;
    createdBefore?: string;
}
