import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { paymentUnavailable } from '../errors/payment-errors';
import {
    ProviderPaymentStatus,
    type CreateProviderPayment,
    type PaymentProvider,
    type ProviderPayment,
    type ProviderRefund,
    type RefundProviderPayment,
} from '../types/payment-provider';


export interface MockPaymentScenario {
    status?: ProviderPaymentStatus;
    delayMs?: number;
    timeoutAfterCreate?: boolean;
}

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
    public readonly name = 'mock';
    private readonly payments = new Map<string, ProviderPayment>();
    private readonly requests = new Map<string, string>();
    private readonly scenarios: MockPaymentScenario[] = [];

    /** Подключает окружение: mock запрещён вне dev/test, управляющие сценарии доступны только в test. */
    constructor(private readonly config: ConfigService) {}

    /** Добавляет сценарий следующей новой попытки исключительно из тестового кода; HTTP-управления нет. */
    public enqueueScenario(scenario: MockPaymentScenario): void {
        if (this.config.get<string>('NODE_ENV') !== 'test') {
            throw new Error('Mock controls are available only in tests');
        }

        this.scenarios
            .push(scenario);
    }

    /** Возвращает детерминированный mock-платёж по ключу, без списания; повтор не расходует новый сценарий. */
    public async createPayment(input: CreateProviderPayment): Promise<ProviderPayment> {
        this.ensureEnabled();

        const externalId = `mock_${createHash('sha256').update(input.idempotencyKey).digest('hex')}`;
        const fingerprint = JSON.stringify([input.orderId, input.amount, input.currency]);
        const stored = this.payments.get(externalId);

        if (stored) {
            if (this.requests.get(externalId) !== fingerprint) {
                throw new Error('Idempotency key has a different payload');
            }

            return { ...stored };
        }

        const scenario = this.scenarios
            .shift() ?? {};
        const status = scenario.status ?? ProviderPaymentStatus.PENDING;

        const payment: ProviderPayment = {
            externalId,
            orderId: input.orderId,
            amount: input.amount,
            currency: input.currency,
            status,
            captured: status === ProviderPaymentStatus.SUCCEEDED,
            confirmationUrl: status === ProviderPaymentStatus.PENDING ? input.returnUrl : null,
            paidAt: status === ProviderPaymentStatus.SUCCEEDED ? new Date() : null,
        };

        this.payments.set(externalId, payment);
        this.requests.set(externalId, fingerprint);

        if (scenario.delayMs) {
            await new Promise<void>((resolve) => setTimeout(resolve, scenario.delayMs));
        }

        if (scenario.timeoutAfterCreate) {
            throw new Error('Simulated lost provider response');
        }

        return { ...payment };
    }

    /** Читает финансовый результат mock из памяти; используется тестами и будущей сверкой. */
    public async getPayment(externalId: string): Promise<ProviderPayment> {
        this.ensureEnabled();

        const payment = this.payments.get(externalId);

        if (!payment) {
            throw new Error('Unknown mock payment');
        }

        return { ...payment };
    }

    /** Отменяет только незавершённую попытку; уже списанный результат остаётся неизменным. */
    public async cancelPayment(externalId: string): Promise<ProviderPayment> {
        const payment = await this.getPayment(externalId);

        if (payment.status === ProviderPaymentStatus.PENDING || payment.status === ProviderPaymentStatus.AUTHORIZED) {
            payment.status = ProviderPaymentStatus.CANCELLED;
            payment.confirmationUrl = null;
            this.payments.set(externalId, payment);
        }

        return { ...payment };
    }

    /** Явно отклоняет возврат: это только контракт следующего этапа, а не имитация возврата денег. */
    public async refundPayment(input: RefundProviderPayment): Promise<ProviderRefund> {
        void input;

        throw new Error('Refunds are not implemented');
    }

    /** Исключает создание любых mock-платежей в production и при неизвестном окружении. */
    private ensureEnabled(): void {
        const environment = this.config.get<string>('NODE_ENV');

        if (environment !== 'dev' && environment !== 'test') {
            paymentUnavailable();
        }
    }
}
