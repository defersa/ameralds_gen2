import { RefundProcessingService } from '@am-back/db/service/refunds/refund-processing.service';
import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiNoContentResponse, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';


@Controller('refund-webhooks')
@ApiTags('refund-webhooks')
export class RefundWebhookController {
    /** Подключает проверку подлинности и серверное чтение финансового результата возврата. */
    constructor(private readonly processing: RefundProcessingService) {}

    /** Принимает подписанное уведомление; данные тела не подтверждают успешный возврат. */
    @Post(':provider')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiBody({ schema: { type: 'object', additionalProperties: true } })
    @ApiHeader({ name: 'x-payment-signature', required: true })
    @ApiNoContentResponse({ description: 'Проверенный результат сохранён.' })
    @ApiUnauthorizedResponse({ description: 'Недействительная подпись или неизвестный провайдер.' })
    @ApiServiceUnavailableResponse({ description: 'Повторите доставку после сохранения операции или восстановления сервиса.' })
    public webhook(
        @Param('provider') provider: string,
        @Body() payload: unknown,
        @Headers('x-payment-signature') signature: string | undefined,
    ): Promise<void> {
        return this.processing.webhook(provider, payload, signature);
    }
}
