import type { OrderStatus } from '@am-back/db/entities/purchases/order.entity';


export interface UserOrderFilters {
    page: number;
    status?: OrderStatus;
    createdFrom?: string;
    createdBefore?: string;
    minAmount?: number;
    maxAmount?: number;
}
