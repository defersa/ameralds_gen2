import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { UserEntity } from '@am-back/db/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { testService } from '../../../../test/feature-services';
import { UserOrderRepository } from '../order/repositories/user-order.repository';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PAYMENT_PROVIDER, ProviderPaymentStatus, type PaymentProvider, type ProviderPayment } from './types/payment-provider';


describe('PaymentVerificationService cancellation races', () => {
    let verification: PaymentVerificationService;
    let payment: UserPaymentEntity;
    let result: ProviderPayment;

    const payments = {
        findForVerification: jest.fn(),
        claimCheck: jest.fn(),
        deferCheck: jest.fn(),
    };

    const processor = { processPaymentResult: jest.fn() };

    const provider = {
        name: 'test',
        createPayment: jest.fn(),
        getPayment: jest.fn(),
        cancelPayment: jest.fn(),
        refundPayment: jest.fn(),
    } satisfies jest.Mocked<PaymentProvider>;

    beforeEach(async () => {
        jest.resetAllMocks();
        payment = Object.assign(new UserPaymentEntity(), {
            id: 1,
            orderId: 17,
            order: Object.assign(new UserOrderEntity(), {
                id: 17,
                status: OrderStatus.CANCELLED,
                user: Object.assign(new UserEntity(), { id: 42 }),
            }),
            provider: provider.name,
            externalId: 'external-1',
            idempotencyKey: randomUUID(),
            amount: 12345,
            currency: 'RUB',
            status: PaymentStatus.PENDING,
            checkFailures: 0,
        });
        result = {
            externalId: 'external-1',
            orderId: 17,
            amount: 12345,
            currency: 'RUB',
            status: ProviderPaymentStatus.PENDING,
            captured: false,
            paidAt: null,
            confirmationUrl: null,
        };
        payments.findForVerification.mockResolvedValue(payment);
        payments.claimCheck.mockResolvedValue(true);
        provider.getPayment.mockImplementation(async () => result);
        provider.createPayment.mockImplementation(async () => result);
        verification = await testService(PaymentVerificationService, [
            {
                provide: UserOrderRepository,
                useValue: {},
            },
            {
                provide: PaymentRepository,
                useValue: payments,
            },
            {
                provide: PaymentService,
                useValue: processor,
            },
            {
                provide: PAYMENT_PROVIDER,
                useValue: provider,
            },
            {
                provide: ConfigService,
                useValue: new ConfigService({ SITE_URL: 'https://shop.example.test' }),
            },
        ]);
    });

    it.each([false, true])('processes capture without cancellation even when the cancellation API fails (explicit cancel: %s)', async (cancel) => {
        if (cancel && payment.order) {
            payment.order.status = OrderStatus.PENDING_PAYMENT;
        }

        result.status = ProviderPaymentStatus.SUCCEEDED;
        result.captured = true;
        result.paidAt = new Date();
        provider.cancelPayment.mockRejectedValue(new Error('Cancellation unavailable'));

        await expect(verification.verify(payment.id, true, cancel)).resolves.toBe(true);
        expect(processor.processPaymentResult).toHaveBeenCalledWith(42, 17, payment.id, result);
        expect(provider.cancelPayment).not.toHaveBeenCalled();
        expect(payments.deferCheck).not.toHaveBeenCalled();
    });

    it('processes a recovered capture before trying to cancel a reservation without an external ID', async () => {
        payment.externalId = null;
        result.status = ProviderPaymentStatus.SUCCEEDED;
        result.captured = true;
        result.paidAt = new Date();
        provider.cancelPayment.mockRejectedValue(new Error('Cancellation unavailable'));

        await expect(verification.verify(payment.id, true, true)).resolves.toBe(true);
        expect(provider.createPayment).toHaveBeenCalledWith(expect.objectContaining({
            idempotencyKey: payment.idempotencyKey,
        }));
        expect(processor.processPaymentResult).toHaveBeenCalledWith(42, 17, payment.id, result);
        expect(provider.cancelPayment).not.toHaveBeenCalled();
    });

    it.each([ProviderPaymentStatus.FAILED, ProviderPaymentStatus.CANCELLED])(
        'records terminal status %s without requesting cancellation again', async (status) => {
            result.status = status;

            await expect(verification.verify(payment.id, true)).resolves.toBe(true);
            expect(processor.processPaymentResult).toHaveBeenCalledWith(42, 17, payment.id, result);
            expect(provider.cancelPayment).not.toHaveBeenCalled();
        },
    );

    it.each([ProviderPaymentStatus.PENDING, ProviderPaymentStatus.AUTHORIZED, ProviderPaymentStatus.UNKNOWN])(
        'retries cancellation failure for unfinished status %s', async (status) => {
            result.status = status;
            provider.cancelPayment.mockRejectedValue(new Error('Cancellation unavailable'));

            await expect(verification.verify(payment.id, true)).resolves.toBe(false);
            expect(provider.cancelPayment).toHaveBeenCalledWith(result.externalId);
            expect(payments.deferCheck).toHaveBeenCalledWith(payment.id, 1);
            expect(processor.processPaymentResult).not.toHaveBeenCalled();
        },
    );

    it('processes a capture that wins the race with cancellation', async () => {
        const captured: ProviderPayment = {
            ...result,
            status: ProviderPaymentStatus.SUCCEEDED,
            captured: true,
            paidAt: new Date(),
        };

        provider.cancelPayment.mockResolvedValue(captured);

        await expect(verification.verify(payment.id, true)).resolves.toBe(true);
        expect(processor.processPaymentResult).toHaveBeenCalledWith(42, 17, payment.id, captured);
    });
});
