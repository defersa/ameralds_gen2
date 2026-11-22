import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
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

export interface MockRefundScenario {
    status?: ProviderRefund['status'];
    timeoutAfterCreate?: boolean;
}

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
    public readonly name = 'mock';
    private readonly payments = new Map<string, ProviderPayment>();
    private readonly requests = new Map<string, string>();
    private readonly scenarios: MockPaymentScenario[] = [];
    private readonly refunds = new Map<string, ProviderRefund>();
    private readonly refundScenarios: MockRefundScenario[] = [];

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

    /** Меняет состояние существующей попытки только из теста; HTTP-управления и реального списания нет. */
    public async setResult(externalId: string, status: ProviderPaymentStatus): Promise<void> {
        if (this.config.get<string>('NODE_ENV') !== 'test') {
            throw new Error('Mock controls are available only in tests');
        }

        const payment = await this.getPayment(externalId);

        this.payments.set(externalId, {
            ...payment,
            status,
            captured: status === ProviderPaymentStatus.SUCCEEDED,
            paidAt: status === ProviderPaymentStatus.SUCCEEDED ? new Date() : null,
            confirmationUrl: status === ProviderPaymentStatus.PENDING ? payment.confirmationUrl : null,
        });
    }

    /** Проверяет HMAC-SHA256 внешнего ID в dev/test; статус payload игнорируется и перечитывается через getPayment. */
    public async verifyWebhook(payload: unknown, signature: string | undefined): Promise<string> {
        this.ensureEnabled();

        const secret = this.config.get<string>('PAYMENT_MOCK_WEBHOOK_SECRET');

        if (!secret || typeof payload !== 'object' || payload === null || !('externalId' in payload) ||
            typeof payload.externalId !== 'string' || payload.externalId.length > 255 ||
            !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
            throw new UnauthorizedException();
        }

        const expected = createHmac('sha256', secret).update(payload.externalId).digest();

        if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
            throw new UnauthorizedException();
        }

        return payload.externalId;
    }

    /**
     * Возвращает mock-платёж без списания; auto-success сразу подтверждает покупку через общий обработчик.
     * Явный сценарий автотеста имеет приоритет. Повтор по ключу сохраняет прежний результат и время списания.
     */
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
        const status = scenario.status ?? (this.config.get<string>('PAYMENT_MOCK_MODE') === 'auto-success'
            ? ProviderPaymentStatus.SUCCEEDED
            : ProviderPaymentStatus.PENDING);

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

    /** Задаёт результат следующего mock-возврата только из теста, не выполняя денежную операцию. */
    public enqueueRefundScenario(scenario: MockRefundScenario): void {
        if (this.config.get<string>('NODE_ENV') !== 'test') {
            throw new Error('Mock controls are available only in tests');
        }

        this.refundScenarios.push(scenario);
    }

    /** Меняет результат mock-возврата только из теста для проверки сверки и повторных событий. */
    public async setRefundResult(externalId: string, status: ProviderRefund['status']): Promise<void> {
        if (this.config.get<string>('NODE_ENV') !== 'test') {
            throw new Error('Mock controls are available only in tests');
        }

        const refund = await this.getRefund(externalId);

        this.refunds.set(externalId, { ...refund, status });
    }

    /** Создаёт mock полного возврата по исходному платежу без движения денег и сохраняет результат до ответа. */
    public async refundPayment(input: RefundProviderPayment): Promise<ProviderRefund> {
        this.ensureEnabled();

        const externalId = `mock_refund_${createHash('sha256').update(input.idempotencyKey).digest('hex')}`;
        const existing = this.refunds.get(externalId);

        if (existing) {
            if (existing.paymentExternalId !== input.externalId || existing.amount !== input.amount ||
                existing.currency !== input.currency || existing.idempotencyKey !== input.idempotencyKey) {
                throw new Error('Idempotency key has a different payload');
            }

            return { ...existing };
        }

        const payment = await this.getPayment(input.externalId);

        if (payment.status !== ProviderPaymentStatus.SUCCEEDED || !payment.captured ||
            input.amount !== payment.amount || input.currency !== payment.currency) {
            throw new Error('Only a captured payment can be fully refunded');
        }

        const scenario = this.refundScenarios.shift() ?? {};
        const refund: ProviderRefund = {
            externalId,
            paymentExternalId: input.externalId,
            idempotencyKey: input.idempotencyKey,
            amount: input.amount,
            currency: input.currency,
            status: scenario.status ?? 'succeeded',
        };

        this.refunds.set(externalId, refund);

        if (scenario.timeoutAfterCreate) {
            throw new Error('Simulated lost refund response');
        }

        return { ...refund };
    }

    /** Читает сохранённый результат mock-возврата или сообщает об отсутствии записи. */
    public async getRefund(externalId: string): Promise<ProviderRefund> {
        this.ensureEnabled();

        const refund = this.refunds.get(externalId);

        if (!refund) {
            throw new Error('Unknown mock refund');
        }

        return { ...refund };
    }

    /** Находит mock-возврат по исходному ключу после потери ответа; нового запроса на возврат не создаёт. */
    public async findRefundByKey(idempotencyKey: string): Promise<ProviderRefund | null> {
        this.ensureEnabled();

        const externalId = `mock_refund_${createHash('sha256').update(idempotencyKey).digest('hex')}`;
        const refund = this.refunds.get(externalId);

        return refund ? { ...refund } : null;
    }

    /** Исключает создание любых mock-платежей в production и при неизвестном окружении. */
    private ensureEnabled(): void {
        const environment = this.config.get<string>('NODE_ENV');

        if (environment !== 'dev' && environment !== 'test') {
            paymentUnavailable();
        }
    }
}
