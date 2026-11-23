import { invalidOrder } from '@am-back/db/service/order/errors/order-validation';
import { Injectable, type PipeTransform } from '@nestjs/common';
import type { OrderActionDto } from './dto/admin-placed-order.dto';


@Injectable()
export class OrderActionPipe implements PipeTransform<unknown, OrderActionDto> {
    /** Принимает только причину; запрещает произвольные суммы и частичный состав даже при прямом API-вызове. */
    public transform(value: unknown): OrderActionDto {
        if (
            !value ||
            typeof value !== 'object' ||
            Array.isArray(value) ||
            !('reason' in value) ||
            Object.keys(value).length !== 1 ||
            typeof value.reason !== 'string' ||
            !value.reason.trim() ||
            value.reason.length > 2000
        ) {
            invalidOrder();
        }

        return {
            reason: value.reason.trim(),
        };
    }
}
