import type { OrderCurrency } from '@am-back/db/entities/purchases/order-snapshot.model';


export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export enum ProviderPaymentStatus {
    PENDING = 'pending',
    AUTHORIZED = 'authorized',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export interface CreateProviderPayment {
    idempotencyKey: string;
    orderId: number;
    amount: number;
    currency: OrderCurrency;
    returnUrl: string;
}

export interface ProviderPayment {
    externalId: string;
    orderId: number;
    amount: number;
    currency: OrderCurrency;
    status: ProviderPaymentStatus;
    captured: boolean;
    confirmationUrl: string | null;
    paidAt: Date | null;
}

export interface RefundProviderPayment {
    externalId: string;
    idempotencyKey: string;
    amount: number;
    currency: OrderCurrency;
}

export interface ProviderRefund {
    externalId: string;
    status: 'pending' | 'succeeded' | 'failed';
}

export interface PaymentProvider {
    readonly name: string;

    /** Создаёт либо возвращает прежний платёж; ключ обязан переживать таймауты и перезапуски приложения. */
    createPayment(input: CreateProviderPayment): Promise<ProviderPayment>;

    /** Возвращает проверенный статус; авторизация средств не считается окончательным списанием. */
    getPayment(externalId: string): Promise<ProviderPayment>;

    /** Идемпотентно запрашивает отмену, возвращая фактический результат гонки со списанием. */
    cancelPayment(externalId: string): Promise<ProviderPayment>;

    /** Контракт будущего возврата в минимальных единицах; бизнес-процесс реализуется отдельно. */
    refundPayment(input: RefundProviderPayment): Promise<ProviderRefund>;
}
