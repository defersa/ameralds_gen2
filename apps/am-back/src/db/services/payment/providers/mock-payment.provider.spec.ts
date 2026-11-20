import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ProviderPaymentStatus, type CreateProviderPayment } from '../types/payment-provider';
import { MockPaymentProvider } from './mock-payment.provider';


describe('MockPaymentProvider', () => {
    const input = {
        idempotencyKey: randomUUID(),
        orderId: 17,
        amount: 12345,
        currency: 'RUB',
        returnUrl: 'https://shop.example.test/account/orders/17',
    } satisfies CreateProviderPayment;

    /** Создаёт независимый mock без сетевых вызовов и денежного списания. */
    function mock(): MockPaymentProvider {
        return new MockPaymentProvider(new ConfigService({ NODE_ENV: 'test' }));
    }

    it('produces stable external IDs after provider restarts and rejects different payloads for the same key', async () => {
        const provider = mock();
        const first = await provider.createPayment(input);
        const restarted = await mock().createPayment(input);

        expect(restarted.externalId).toBe(first.externalId);
        await expect(
            provider.createPayment({
                ...input,
                amount: 1,
            }),
        ).rejects.toThrow('different payload');
    });

    it('cancels an authorized attempt idempotently and preserves captured results', async () => {
        const provider = mock();

        provider.enqueueScenario({ status: ProviderPaymentStatus.AUTHORIZED });

        const authorized = await provider.createPayment(input);
        const cancelled = await provider.cancelPayment(authorized.externalId);

        expect(cancelled.status).toBe(ProviderPaymentStatus.CANCELLED);
        expect(await provider.cancelPayment(authorized.externalId)).toEqual(cancelled);
        provider.enqueueScenario({ status: ProviderPaymentStatus.SUCCEEDED });

        const captured = await provider.createPayment({
            ...input,
            idempotencyKey: randomUUID(),
        });

        expect(await provider.cancelPayment(captured.externalId)).toEqual(captured);
        expect(await provider.getPayment(captured.externalId)).toMatchObject({ captured: true });
    });

    it('does not pretend that refund support has been implemented', async () => {
        await expect(
            mock().refundPayment({
                externalId: 'mock',
                idempotencyKey: randomUUID(),
                amount: 1,
                currency: 'RUB',
            }),
        ).rejects.toThrow('Refunds are not implemented');
    });

    it('automatically captures dev purchases only with auto-success enabled and preserves the original result on retry', async () => {
        const provider = new MockPaymentProvider(new ConfigService({
            NODE_ENV: 'dev',
            PAYMENT_MOCK_MODE: 'auto-success',
        }));

        const first = await provider.createPayment(input);

        expect(first).toMatchObject({
            status: ProviderPaymentStatus.SUCCEEDED,
            captured: true,
            confirmationUrl: null,
            amount: input.amount,
            currency: input.currency,
            orderId: input.orderId,
        });
        expect(first.paidAt).toBeInstanceOf(Date);
        expect(await provider.createPayment(input)).toEqual(first);
        expect(await provider.getPayment(first.externalId)).toEqual(first);
    });

    it('keeps ordinary dev payments pending when auto-success is disabled', async () => {
        const provider = new MockPaymentProvider(new ConfigService({ NODE_ENV: 'dev' }));

        await expect(provider.createPayment(input)).resolves.toMatchObject({
            status: ProviderPaymentStatus.PENDING,
            captured: false,
            paidAt: null,
        });
    });

    it.each(['production', 'staging', ''])('rejects auto-success in unsupported environment %s', async (environment) => {
        const provider = new MockPaymentProvider(new ConfigService({
            NODE_ENV: environment,
            PAYMENT_MOCK_MODE: 'auto-success',
        }));

        await expect(provider.createPayment(input)).rejects.toMatchObject({ status: 503 });
    });

    it('allows explicit automated test scenarios to override auto-success', async () => {
        const provider = new MockPaymentProvider(new ConfigService({
            NODE_ENV: 'test',
            PAYMENT_MOCK_MODE: 'auto-success',
        }));

        provider.enqueueScenario({ status: ProviderPaymentStatus.FAILED });

        await expect(provider.createPayment(input)).resolves.toMatchObject({
            status: ProviderPaymentStatus.FAILED,
            captured: false,
        });
    });
});
