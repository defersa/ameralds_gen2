import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderRefund } from '@am-back/db/service/payment/types/payment-provider';
import { paymentUnavailable } from '@am-back/db/service/payment/errors/payment-errors';
import type { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { RefundRepository } from './repositories/refund.repository';
import { RefundDiscoveryService } from './refund-discovery.service';


@Injectable()
export class RefundProcessingService {
    private readonly logger = new Logger(RefundProcessingService.name);

    /** Подключает журнал, подтверждённый обработчик и заменяемый платёжный адаптер. */
    constructor(
        private readonly refunds: RefundRepository,
        private readonly discovery: RefundDiscoveryService,
        @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    ) {}

    /**
     * Однократно забирает сохранённый резерв и отправляет провайдеру прежний ключ и полную сумму.
     * Ошибка или потерянный ответ оставляют операцию неизвестной для сверки, доступ не отзывается.
     */
    public async start(id: number): Promise<boolean> {
        if (!await this.refunds.claimStart(id)) {
            return false;
        }

        const refund = await this.refunds.findForProcessing(id);

        if (!refund || refund.provider !== this.provider.name || !refund.payment?.externalId) {
            await this.refunds.markUnknown(id);

            return false;
        }

        try {
            const result = await this.bounded(this.provider.refundPayment({
                externalId: refund.payment.externalId,
                idempotencyKey: refund.idempotencyKey,
                amount: refund.amount,
                currency: refund.currency,
            }));

            this.assertOperation(refund, result);
            await this.discovery.observe(this.provider.name, result);

            return true;
        } catch {
            await this.refunds.markUnknown(id);

            return false;
        }
    }

    /** Сверяет прежнюю операцию по внешнему ID или ключу, не создавая повторный возврат при неизвестном исходе. */
    public async verify(id: number): Promise<boolean> {
        if (!await this.refunds.claimCheck(id)) {
            return false;
        }

        const refund = await this.refunds.findForProcessing(id);

        if (!refund || refund.provider !== this.provider.name) {
            await this.refunds.markUnknown(id);

            return false;
        }

        try {
            const result = refund.externalId
                ? await this.bounded(this.provider.getRefund(refund.externalId))
                : await this.bounded(this.provider.findRefundByKey(refund.idempotencyKey));

            if (!result) {
                await this.refunds.markUnknown(id);

                return false;
            }

            this.assertOperation(refund, result);
            await this.discovery.observe(this.provider.name, result);

            return true;
        } catch {
            await this.refunds.markUnknown(id);

            return false;
        }
    }

    /** Проверяет подпись уведомления и перечитывает результат провайдера; ошибка коммита требует повторной доставки. */
    public async webhook(providerName: string, payload: unknown, signature: string | undefined): Promise<void> {
        if (providerName !== this.provider.name || !this.provider.verifyWebhook) {
            throw new UnauthorizedException();
        }

        const externalId = await this.provider.verifyWebhook(payload, signature);

        try {
            const result = await this.bounded(this.provider.getRefund(externalId));

            if (result.externalId !== externalId) {
                throw new Error('Refund webhook result mismatch');
            }

            await this.discovery.observe(providerName, result);
        } catch {
            paymentUnavailable();
        }
    }

    /** Периодически отправляет неиспользованные резервы и сверяет ранее отправленные или неизвестные операции. */
    @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
    public async reconcile(): Promise<void> {
        const due = await this.refunds.due(20);

        for (const refund of due) {
            try {
                if (refund.status === 'accepted') {
                    await this.start(refund.id);
                } else {
                    await this.verify(refund.id);
                }
            } catch {
                this.logger.warn({ event: 'refund_reconciliation_failed', refundId: refund.id });
            }
        }
    }

    /** Проверяет, что ответ относится к запрошенной операции; сумма проверяется обработчиком и может стать инцидентом. */
    private assertOperation(refund: RefundEntity, result: ProviderRefund): void {
        if (result.paymentExternalId !== refund.payment?.externalId ||
            (refund.externalId !== null && refund.externalId !== result.externalId) ||
            (refund.origin !== 'provider' && refund.idempotencyKey !== result.idempotencyKey)) {
            throw new Error('Refund operation result mismatch');
        }
    }

    /** Ограничивает ожидание провайдера десятью секундами, не считая таймаут окончательным отказом. */
    private async bounded<T extends ProviderRefund | null>(request: Promise<T>): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
            return await Promise.race([
                request,
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => reject(new Error('Provider timeout')), 10_000);
                }),
            ]);
        } finally {
            clearTimeout(timer);
        }
    }
}
