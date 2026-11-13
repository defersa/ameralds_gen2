import { PaymentVerificationService } from '@am-back/db/service/payment/payment-verification.service';
import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiNoContentResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';


@Controller('payment-webhooks')
@ApiTags('payment-webhooks')
export class PaymentWebhookController {
    /** Подключает проверку подлинности и общий путь сверки; пользовательский access-токен не используется. */
    constructor(private readonly verification: PaymentVerificationService) {}

    /** Принимает уведомление адаптера; подпись обязательна, финансовые поля payload игнорируются. */
    @Post(':provider')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Throttle({
        default: {
            limit: 120,
            ttl: 60_000,
        },
    })
    @ApiOperation({ description: 'Проверяет подпись адаптером и перечитывает реальный статус через API провайдера.' })
    @ApiBody({
        description: 'Payload адаптера; mock использует externalId. Финансовые поля не являются подтверждением.',
        schema: {
            type: 'object',
            additionalProperties: true,
        },
    })
    @ApiHeader({
        name: 'x-payment-signature',
        required: true,
        description: 'Подпись по контракту адаптера.',
    })
    @ApiNoContentResponse({ description: 'Проверенный результат записан; повторная доставка безопасна.' })
    @ApiUnauthorizedResponse({ description: 'Неизвестный провайдер или недействительная подпись.' })
    @ApiServiceUnavailableResponse({ description: 'Повторите доставку: внешний ID ещё не сохранён или сверка/коммит не завершились.' })
    public webhook(
        @Param('provider') provider: string,
        @Body() payload: unknown,
        @Headers('x-payment-signature') signature: string | undefined,
    ): Promise<void> {
        return this.verification.webhook(provider, payload, signature);
    }
}
