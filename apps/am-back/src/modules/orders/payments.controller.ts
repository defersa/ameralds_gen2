import { Auth } from '@am-back/core/guards/auth.guard';
import { PaymentService } from '@am-back/db/service/payment/payment.service';
import type { RequestModel } from '@am-back/models/request.model';
import { ErrorsDto } from '@am-back/modules/errors/errors.dto';
import { Body, Controller, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiServiceUnavailableResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreatePaymentDto, PaymentAttemptDto } from './dto/payment.dto';
import { PaymentInputPipe } from './payment-input.pipe';


@Controller('orders')
@ApiTags('orders')
@Auth()
export class PaymentsController {
    /** Подключает создание и восстановление платёжных попыток авторизованного владельца заказа. */
    constructor(private readonly payments: PaymentService) {}

    /** Создаёт/возвращает попытку с серверной суммой; повторный UUID восстанавливает результат после сетевой ошибки. */
    @Post(':id/payments')
    @ApiBody({ type: CreatePaymentDto })
    @ApiCreatedResponse({
        type: PaymentAttemptDto,
        description: 'Созданная или ранее сохранённая попытка; redirect не подтверждает оплату заказа.',
    })
    @ApiBadRequestResponse({
        type: ErrorsDto,
        description:
            'INVALID: параметры, статус, сумма или срок; NOT_EXIST: заказ отсутствует, неактивен или принадлежит другому пользователю.',
    })
    @ApiConflictResponse({
        type: ErrorsDto,
        description: 'PAYMENT_CONFLICT: ключ занят другим заказом или новая оплата уже недопустима.',
    })
    @ApiServiceUnavailableResponse({
        type: ErrorsDto,
        description: 'PAYMENT_UNAVAILABLE: повторите с прежним ключом; статус попытки остаётся неопределённым.',
    })
    @ApiUnauthorizedResponse({
        type: ErrorsDto,
        description: 'Требуется авторизация.',
    })
    public createPayment(
        @Req() request: RequestModel,
        @Param('id', ParseIntPipe) id: number,
        @Body(PaymentInputPipe) input: CreatePaymentDto,
    ): Promise<PaymentAttemptDto> {
        return this.payments.createPayment(request.user.id, id, input.idempotencyKey);
    }
}
