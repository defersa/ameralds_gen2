import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import { UserOrderRepository } from '@am-back/db/service/order/repositories/user-order.repository';
import { PAYMENT_PROVIDER } from '@am-back/db/service/payment/types/payment-provider';
import { DataSource } from 'typeorm';
import { testService } from '../../../../test/feature-services';
import { RefundRepository } from './repositories/refund.repository';
import { RefundReservationService } from './refund-reservation.service';


describe('full refund reservation', () => {
    const manager = {};
    const source = { transaction: jest.fn(async (callback: (value: object) => Promise<unknown>) => callback(manager)) };
    const refunds = {
        findOwnerId: jest.fn(), isAdministrator: jest.fn(), hasIncident: jest.fn(), findBlocking: jest.fn(),
        successfulPayments: jest.fn(), reserve: jest.fn(),
    };
    const orders = { lockOwner: jest.fn(), lockForPayment: jest.fn(), databaseTime: jest.fn() };
    const provider = { name: 'mock' };
    const order = {
        id: 7, state: ModelState.ACTIVE, status: OrderStatus.PAID, paidAt: new Date(),
        placedAt: new Date(), sourceAdminOrder: null, totalAmount: 1200, currency: 'RUB',
    };
    const payment = {
        status: PaymentStatus.SUCCEEDED,
        id: 8, resolution: 'completed', provider: 'mock', externalId: 'payment',
        paidAt: new Date(), amount: 1200, currency: 'RUB',
    };
    let service: RefundReservationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        refunds.findOwnerId.mockResolvedValue(42);
        refunds.isAdministrator.mockResolvedValue(true);
        refunds.findBlocking.mockResolvedValue(null);
        refunds.successfulPayments.mockResolvedValue([payment]);
        refunds.reserve.mockImplementation(async (value: object) => value);
        orders.lockForPayment.mockResolvedValue(order);
        orders.databaseTime.mockResolvedValue(new Date('2026-11-20T12:00:00Z'));
        service = await testService(RefundReservationService, [
            { provide: DataSource, useValue: source },
            { provide: RefundRepository, useValue: refunds },
            { provide: UserOrderRepository, useValue: orders },
            { provide: PAYMENT_PROVIDER, useValue: provider },
        ]);
    });

    it('stores the paid amount and a new key before any provider call', async () => {
        const result = await service.reserve(99, 7, ' Полный возврат ');

        expect(result.created).toBe(true);
        expect(refunds.reserve).toHaveBeenCalledWith(expect.objectContaining({
            orderId: 7, paymentId: 8, initiatedBy: 99, amount: 1200, currency: 'RUB',
            reason: 'Полный возврат', status: 'accepted', idempotencyKey: expect.any(String),
        }), manager);
        expect(orders.lockOwner).toHaveBeenCalledWith(42, manager);
    });

    it('returns an existing operation without creating another', async () => {
        const existing = { id: 5, status: 'unknown' };

        refunds.findBlocking.mockResolvedValue(existing);
        await expect(service.reserve(99, 7, 'Повтор')).resolves.toEqual({ refund: existing, created: false });
        expect(refunds.reserve).not.toHaveBeenCalled();
    });

    it('rejects a non-administrator before locking or reserving', async () => {
        refunds.isAdministrator.mockResolvedValue(false);
        await expect(service.reserve(99, 7, 'Причина')).rejects.toMatchObject({ status: 403 });
        expect(refunds.reserve).not.toHaveBeenCalled();
    });

    it.each(['no payment', 'two payments', 'different amount', 'unconfirmed', 'admin order'] as const)(
        'rejects %s without reserving', async (scenario) => {
            if (scenario === 'no payment') {
                refunds.successfulPayments.mockResolvedValue([]);
            }

            if (scenario === 'two payments') {
                refunds.successfulPayments.mockResolvedValue([payment, { ...payment, id: 9 }]);
            }

            if (scenario === 'different amount') {
                refunds.successfulPayments.mockResolvedValue([{ ...payment, amount: 1 }]);
            }

            if (scenario === 'unconfirmed') {
                refunds.successfulPayments.mockResolvedValue([{ ...payment, resolution: 'compensation_required' }]);
            }

            if (scenario === 'admin order') {
                orders.lockForPayment.mockResolvedValue({ ...order, sourceAdminOrder: 1 });
            }

            await expect(service.reserve(99, 7, 'Причина')).rejects.toMatchObject({ status: 400 });
            expect(refunds.reserve).not.toHaveBeenCalled();
        },
    );
});
