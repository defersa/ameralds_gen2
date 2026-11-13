import { MailService } from '@am-back/mail/mail.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentEffectRepository } from './repositories/payment-effect.repository';
import { PaymentVerificationService } from './payment-verification.service';


@Injectable()
export class PaymentEffectsService {
    private readonly logger = new Logger(PaymentEffectsService.name);

    /** Подключает очередь, проверяемую отмену у провайдера и SMTP; всё вызывается после транзакции покупки. */
    constructor(
        private readonly effects: PaymentEffectRepository,
        private readonly verification: PaymentVerificationService,
        private readonly mail: MailService,
        private readonly config: ConfigService,
    ) {}

    /** Выполняет ограниченную порцию at-least-once; сбой после отправки допускает повтор с тем же Message-ID. */
    @Cron(CronExpression.EVERY_30_SECONDS, { waitForCompletion: true })
    public async drain(): Promise<void> {
        for (let index = 0; index < 20; index++) {
            const effect = await this.effects.claim();

            if (!effect) {
                return;
            }

            try {
                if (effect.kind === 'cancel_payment') {
                    if (!effect.paymentId || !await this.verification.verify(effect.paymentId, false, true)) {
                        throw new Error('Payment cancellation unavailable');
                    }
                } else if (effect.kind === 'purchase_email') {
                    await this.sendPurchaseMail(effect.orderId);
                } else {
                    // Сам инцидент остаётся неразрешённым в payment.resolution; здесь подтверждаем доставку в мониторинг.
                    this.logger.error({
                        event: 'payment_compensation_required',
                        paymentId: effect.paymentId,
                        orderId: effect.orderId,
                    });
                }

                await this.effects.complete(effect);
            } catch {
                await this.effects.retry(effect);
                this.logger.warn({
                    event: 'payment_effect_retry',
                    effectId: effect.id,
                    attempts: effect.attempts,
                });
            }
        }
    }

    /** Отправляет подтверждённую покупку со ссылкой в личный кабинет; отсутствие SMTP вызывает надёжный повтор. */
    private async sendPurchaseMail(orderId: number): Promise<void> {
        const order = await this.effects.findMailOrder(orderId);

        if (!order?.user?.email) {
            throw new Error('Purchase recipient unavailable');
        }

        const origin = this.config.get<string>('SITE_URL') ||
            (this.config.get<string>('NODE_ENV') === 'dev' ? 'http://localhost:4400' : '');
        const url = new URL(`/account/orders/${orderId}`, origin);

        const items = order.patterns
            .map((item) => item.snapshot?.name?.ru ?? 'Схема')
            .join('\n');

        await this.mail.send({
            to: order.user.email,
            messageId: `<purchase-${orderId}@ameralds>`,
            subject: `Заказ №${orderId} оплачен`,
            text: `Спасибо за покупку!\n\n${items}\n\nМатериалы заказа доступны в личном кабинете:\n${url.toString()}`,
        });
    }
}
