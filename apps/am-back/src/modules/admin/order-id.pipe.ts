import { INT32_MAX } from '@ameralds/utils';
import { invalidOrder } from '@am-back/db/service/order/errors/order-validation';
import { Injectable, type PipeTransform } from '@nestjs/common';


@Injectable()
export class OrderIdPipe implements PipeTransform<string, number> {
    /** Ограничивает ID положительным PostgreSQL integer до обращения к БД. */
    public transform(value: string): number {
        const id = Number(value);

        if (!/^\d+$/.test(value) || !Number.isInteger(id) || id < 1 || id > INT32_MAX) {
            invalidOrder();
        }

        return id;
    }
}
