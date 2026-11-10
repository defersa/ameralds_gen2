import { Injectable, type PipeTransform } from '@nestjs/common';
import { invalidPayment } from '@am-back/db/service/payment/errors/payment-errors';
import type { CreatePaymentDto } from './dto/payment.dto';


@Injectable()
export class PaymentInputPipe implements PipeTransform<unknown, CreatePaymentDto> {
    /** Принимает только UUID попытки; клиентские суммы, userId, статус, провайдер и URL отклоняются. */
    public transform(value: unknown): CreatePaymentDto {
        if (
            !value ||
            typeof value !== 'object' ||
            Array.isArray(value) ||
            Object.keys(value).length !== 1 ||
            !('idempotencyKey' in value) ||
            typeof value.idempotencyKey !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.idempotencyKey)
        ) {
            invalidPayment();
        }

        return { idempotencyKey: value.idempotencyKey.toLowerCase() };
    }
}
