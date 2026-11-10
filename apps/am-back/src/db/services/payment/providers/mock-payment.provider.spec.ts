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
});
