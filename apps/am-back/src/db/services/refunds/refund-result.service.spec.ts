import { UserOrderEntity, OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { UserPaymentEntity, PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { UserOrderRepository } from '@am-back/db/service/order/repositories/user-order.repository';
import { PatternGrantsService } from '@am-back/db/service/pattern-grants/pattern-grants.service';
import { PaymentCompletionRepository } from '@am-back/db/service/payment/repositories/payment-completion.repository';
import type { ProviderRefund } from '@am-back/db/service/payment/types/payment-provider';
import { DataSource } from 'typeorm';
import { testService } from '../../../../test/feature-services';
import { RefundRepository } from './repositories/refund.repository';
import { RefundResultService } from './refund-result.service';


describe('confirmed refund result', () => {
    let service: RefundResultService;
    let refund: RefundEntity;
    let payment: UserPaymentEntity;
    let order: UserOrderEntity;
    let result: ProviderRefund;
    const now = new Date('2026-11-20T12:00:00Z');
    const grants = { revokeRefundedOrder: jest.fn() };
    const effects = { enqueue: jest.fn() };
    const incidents = { hasIncident: jest.fn() };
    const orders = { lockOwner: jest.fn(), lockForPayment: jest.fn(), databaseTime: jest.fn() };
    const refundRepository = { findOne: jest.fn(), save: jest.fn() };
    const orderRepository = { update: jest.fn() };
    const paymentRepository = { findOne: jest.fn() };
    const manager = {
        getRepository: jest.fn((entity: unknown) => {
            if (entity === RefundEntity) {
                return refundRepository;
            }

            if (entity === UserPaymentEntity) {
                return paymentRepository;
            }

            return orderRepository;
        }),
    };
    const source = {
        getRepository: jest.fn(() => refundRepository),
        transaction: jest.fn(async (fn: (value: typeof manager) => Promise<unknown>) => fn(manager)),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        order = Object.assign(new UserOrderEntity(), {
            id: 7, status: OrderStatus.PAID, totalAmount: 1200, currency: 'RUB', sourceAdminOrder: null,
            user: { id: 42 },
        });
        payment = Object.assign(new UserPaymentEntity(), {
            id: 8, orderId: 7, status: PaymentStatus.SUCCEEDED, resolution: 'completed',
            provider: 'mock', externalId: 'payment-1', amount: 1200, currency: 'RUB',
        });
        refund = Object.assign(new RefundEntity(), {
            id: 9, orderId: 7, paymentId: 8, order, provider: 'mock', externalId: null,
            amount: 1200, currency: 'RUB', idempotencyKey: 'key-1', status: 'processing',
            transitions: [], initiatedBy: 99, reason: 'Возврат',
        });
        result = {
            externalId: 'refund-1', paymentExternalId: 'payment-1', idempotencyKey: 'key-1',
            amount: 1200, currency: 'RUB', status: 'succeeded',
        };
        refundRepository.findOne.mockResolvedValue(refund);
        refundRepository.save.mockImplementation(async (value: RefundEntity) => value);
        paymentRepository.findOne.mockResolvedValue(payment);
        orders.lockForPayment.mockResolvedValue(order);
        orders.databaseTime.mockResolvedValue(now);
        service = await testService(RefundResultService, [
            { provide: DataSource, useValue: source },
            { provide: UserOrderRepository, useValue: orders },
            { provide: PatternGrantsService, useValue: grants },
            { provide: PaymentCompletionRepository, useValue: effects },
            { provide: RefundRepository, useValue: incidents },
        ]);
    });

    it('applies confirmed success with revocation and outbox in the same transaction', async () => {
        const saved = await service.apply(9, result);

        expect(orders.lockOwner).toHaveBeenCalledWith(42, manager);
        expect(orderRepository.update).toHaveBeenCalledWith(7, { status: OrderStatus.REFUNDED });
        expect(grants.revokeRefundedOrder).toHaveBeenCalledWith(42, 7, 99, 'Возврат', 'refund-1', manager);
        expect(effects.enqueue).toHaveBeenCalledWith('refund_email', 7, 8, manager);
        expect(saved).toMatchObject({ status: 'succeeded', externalId: 'refund-1', completedAt: now });
    });

    it.each(['unknown', 'pending', 'failed'] as const)('retains access for %s', async (status) => {
        result.status = status;
        await service.apply(9, result);
        expect(orderRepository.update).not.toHaveBeenCalled();
        expect(grants.revokeRefundedOrder).not.toHaveBeenCalled();
        expect(effects.enqueue).not.toHaveBeenCalled();
    });

    it('rejects a different amount before changing rights or the order', async () => {
        result.amount = 1;
        await expect(service.apply(9, result)).rejects.toThrow('mismatch');
        expect(orderRepository.update).not.toHaveBeenCalled();
    });

    it('keeps access if a financial incident was recorded between discovery and finalization', async () => {
        incidents.hasIncident.mockResolvedValueOnce(true);
        await expect(service.apply(9, result)).rejects.toThrow('manual reconciliation');
        expect(orderRepository.update).not.toHaveBeenCalled();
        expect(grants.revokeRefundedOrder).not.toHaveBeenCalled();
    });

    it('propagates a revocation failure without writing the final journal or queuing a message', async () => {
        grants.revokeRefundedOrder.mockRejectedValueOnce(new Error('Projection failed'));
        await expect(service.apply(9, result)).rejects.toThrow('Projection failed');
        expect(refundRepository.save).not.toHaveBeenCalled();
        expect(effects.enqueue).not.toHaveBeenCalled();
    });

    it('ignores an outdated failure after success and does not issue rights again', async () => {
        refund.status = 'succeeded';
        refund.externalId = 'refund-1';
        order.status = OrderStatus.REFUNDED;
        result.status = 'failed';
        await service.apply(9, result);
        expect(grants.revokeRefundedOrder).not.toHaveBeenCalled();
        expect(orderRepository.update).not.toHaveBeenCalled();
    });

    it('surfaces a success after an allegedly final failure for manual reconciliation', async () => {
        refund.status = 'failed';
        refund.externalId = 'refund-1';
        await expect(service.apply(9, result)).rejects.toThrow('manual reconciliation');
    });
});
