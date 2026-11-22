import { PAYMENT_PROVIDER } from '@am-back/db/service/payment/types/payment-provider';
import { testService } from '../../../../test/feature-services';
import { RefundRepository } from './repositories/refund.repository';
import { RefundProcessingService } from './refund-processing.service';
import { RefundResultService } from './refund-result.service';


describe('refund processing and recovery', () => {
    const refunds = {
        claimStart: jest.fn(), claimCheck: jest.fn(), findForProcessing: jest.fn(), markUnknown: jest.fn(), due: jest.fn(),
        findByExternal: jest.fn(),
    };
    const results = { apply: jest.fn() };
    const provider = { name: 'mock', refundPayment: jest.fn(), getRefund: jest.fn(), findRefundByKey: jest.fn(), verifyWebhook: jest.fn() };
    const refund = {
        id: 9, provider: 'mock', payment: { externalId: 'payment-1' },
        idempotencyKey: 'key-1', amount: 1200, currency: 'RUB', externalId: null,
    };
    const result = {
        externalId: 'refund-1', paymentExternalId: 'payment-1', idempotencyKey: 'key-1',
        amount: 1200, currency: 'RUB', status: 'succeeded',
    };
    let service: RefundProcessingService;

    beforeEach(async () => {
        jest.resetAllMocks();
        refunds.claimStart.mockResolvedValue(true);
        refunds.claimCheck.mockResolvedValue(true);
        refunds.findForProcessing.mockResolvedValue(refund);
        provider.refundPayment.mockResolvedValue(result);
        provider.findRefundByKey.mockResolvedValue(result);
        provider.getRefund.mockResolvedValue(result);
        provider.verifyWebhook.mockResolvedValue('refund-1');
        refunds.findByExternal.mockResolvedValue({ id: 9 });
        service = await testService(RefundProcessingService, [
            { provide: RefundRepository, useValue: refunds },
            { provide: RefundResultService, useValue: results },
            { provide: PAYMENT_PROVIDER, useValue: provider },
        ]);
    });

    it('sends only a claimed reservation with its original full amount and key', async () => {
        await expect(service.start(9)).resolves.toBe(true);
        expect(provider.refundPayment).toHaveBeenCalledWith({
            externalId: 'payment-1', idempotencyKey: 'key-1', amount: 1200, currency: 'RUB',
        });
        expect(results.apply).toHaveBeenCalledWith(9, result);
        refunds.claimStart.mockResolvedValue(false);
        await expect(service.start(9)).resolves.toBe(false);
        expect(provider.refundPayment).toHaveBeenCalledTimes(1);
    });

    it('marks a lost response unknown and recovers by the same key without sending again', async () => {
        provider.refundPayment.mockRejectedValue(new Error('timeout'));
        await expect(service.start(9)).resolves.toBe(false);
        expect(refunds.markUnknown).toHaveBeenCalledWith(9);
        await expect(service.verify(9)).resolves.toBe(true);
        expect(provider.findRefundByKey).toHaveBeenCalledWith('key-1');
        expect(provider.refundPayment).toHaveBeenCalledTimes(1);
        expect(results.apply).toHaveBeenCalledWith(9, result);
    });

    it('leaves an absent lookup unresolved and does not start a new refund', async () => {
        provider.findRefundByKey.mockResolvedValue(null);
        await expect(service.verify(9)).resolves.toBe(false);
        expect(refunds.markUnknown).toHaveBeenCalledWith(9);
        expect(provider.refundPayment).not.toHaveBeenCalled();
        expect(results.apply).not.toHaveBeenCalled();
    });

    it('reads the previously stored external ID when available', async () => {
        refunds.findForProcessing.mockResolvedValue({ ...refund, externalId: 'refund-1' });
        await expect(service.verify(9)).resolves.toBe(true);
        expect(provider.getRefund).toHaveBeenCalledWith('refund-1');
        expect(provider.findRefundByKey).not.toHaveBeenCalled();
    });

    it('does not call the provider when another worker owns the lease', async () => {
        refunds.claimCheck.mockResolvedValue(false);
        await expect(service.verify(9)).resolves.toBe(false);
        expect(provider.getRefund).not.toHaveBeenCalled();
        expect(provider.findRefundByKey).not.toHaveBeenCalled();
    });

    it('verifies webhook authenticity and reads the provider result before committing', async () => {
        await service.webhook('mock', { externalId: 'refund-1', amount: 1 }, 'signature');
        expect(provider.verifyWebhook).toHaveBeenCalledWith({ externalId: 'refund-1', amount: 1 }, 'signature');
        expect(provider.getRefund).toHaveBeenCalledWith('refund-1');
        expect(results.apply).toHaveBeenCalledWith(9, result);
    });

    it('rejects unknown providers and asks for retry on an unknown refund', async () => {
        await expect(service.webhook('other', {}, undefined)).rejects.toMatchObject({ status: 401 });
        refunds.findByExternal.mockResolvedValue(null);
        await expect(service.webhook('mock', {}, 'signature')).rejects.toMatchObject({ status: 503 });
        expect(results.apply).not.toHaveBeenCalled();
    });
});
