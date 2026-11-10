import { ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';


/** Отклоняет недопустимые параметры или состояние платежа без раскрытия данных провайдера. */
export function invalidPayment(): never {
    throw new BadRequestException({
        code: ApiErrorCodes.INVALID,
        entity: ApiEntityNames.PAYMENT,
    });
}

/** Сигнализирует о конфликте ключа либо уже подтверждённом платеже; новую попытку создавать нельзя. */
export function paymentConflict(): never {
    throw new ConflictException({
        code: ApiErrorCodes.PAYMENT_CONFLICT,
        entity: ApiEntityNames.PAYMENT,
    });
}

/** Сохраняет неопределённый результат для повтора с прежним ключом; исходная ошибка наружу не передаётся. */
export function paymentUnavailable(): never {
    throw new ServiceUnavailableException({
        code: ApiErrorCodes.PAYMENT_UNAVAILABLE,
        entity: ApiEntityNames.PAYMENT,
    });
}
