import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { toCheckoutOrder } from "./order.mapper";


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
