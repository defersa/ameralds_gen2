import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { OrderStatus, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { toCheckoutOrder, toUserOrderSummary } from "./order.mapper";


describe("toCheckoutOrder", () => {
	it.each([
		{
			placedAt: null,
			appSettingsVersion: 1,
		},
		{
			placedAt: new Date("2026-11-09T12:00:00Z"),
			appSettingsVersion: null,
		},
	])("returns the standard INVALID error for missing placement metadata: %j", (metadata) => {
		const order = Object.assign(new UserOrderEntity(), metadata);

		expect.assertions(1);

		try {
			toCheckoutOrder(order);
		} catch (error) {
			expect(error).toMatchObject({
				status: 400,
				response: {
					code: ApiErrorCodes.INVALID,
					entity: ApiEntityNames.CART,
				},
			});
		}
	});
});

describe('toUserOrderSummary', () => {
    it('returns scalar order data without related entities, discounts or internal state', () => {
        const date = new Date('2026-11-09T12:00:00Z');

        const order = Object.assign(new UserOrderEntity(), {
            id: 17,
            createdAt: date,
            updatedAt: date,
            placedAt: date,
            status: OrderStatus.PENDING_PAYMENT,
            subtotalAmount: 15000,
            discountAmount: 2655,
            totalAmount: 12345,
            currency: 'RUB',
            paymentExpiresAt: new Date('2026-11-16T12:00:00Z'),
            paidAt: null,
            cancelledAt: null,
            cancelReason: null,
            appSettingsVersion: 3,
            user: { email: 'private@example.com', passwordHash: 'secret' },
            sourceAdminOrder: { email: 'source@example.com' },
            payment: { privateData: 'payment-secret' },
            patterns: [{ privatePath: '/private/pattern.pdf' }],
            discounts: [{ type: 'internal', amount: 2655 }],
            state: 'active',
        });

        expect(toUserOrderSummary(order)).toEqual({
            id: 17,
            createdAt: date,
            updatedAt: date,
            placedAt: date,
            status: OrderStatus.PENDING_PAYMENT,
            subtotalAmount: 15000,
            discountAmount: 2655,
            totalAmount: 12345,
            currency: 'RUB',
            paymentExpiresAt: new Date('2026-11-16T12:00:00Z'),
            paidAt: null,
            cancelledAt: null,
            cancelReason: null,
            appSettingsVersion: 3,
        });
    });

    it('preserves unknown legacy metadata and distinguishes an unknown amount from zero', () => {
        const order = Object.assign(new UserOrderEntity(), {
            id: 17,
            status: OrderStatus.PAID,
        });

        expect(toUserOrderSummary(order)).toMatchObject({
            placedAt: null,
            subtotalAmount: null,
            totalAmount: null,
            currency: null,
            discountAmount: 0,
            appSettingsVersion: null,
        });
        order.totalAmount = 0;

        expect(toUserOrderSummary(order).totalAmount).toBe(0);
    });
});
