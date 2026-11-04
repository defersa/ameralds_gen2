import { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import { AdminOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { DataSource } from "typeorm";
import { testService } from "../../../../../test/feature-services";
import { AdminOrderRepository } from "../repositories/admin-order.repository";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { AdminCartService } from "./admin-cart.service";


describe("AdminCartService.clearCart", () => {
	it("waits for deletion in the transaction before committing", async () => {
		let finishRemoval: () => void;

		const removal = new Promise<void>((resolve) => {
			finishRemoval = resolve;
		});

		let started: () => void;

		const pending = new Promise<void>((resolve) => {
			started = resolve;
		});

		let committed = false;

		const cart = Object.assign(new AdminOrderEntity(), {
			id: 1,
			patterns: [Object.assign(new OrderPatternEntity(), { id: 31 })],
		});

		const deleteItems = jest.fn(async () => {
			started();
			await removal;
		});

		const manager = new DataSource({ type: "postgres" }).createEntityManager();

		const service = await testService(AdminCartService, [
			{
				provide: AdminOrderRepository,
				useValue: {
					lockCart: jest.fn(),
					findCart: jest.fn(async () => cart),
				},
			},
			{
				provide: OrderPatternRepository,
				useValue: { deleteItems },
			},
			{
				provide: DataSource,
				useValue: {
					transaction: async (work) => {
						const result = await work(manager);

						committed = true;
						return result;
					},
				},
			},
		]);

		const clearing = service.clearCart();

		await pending;
		expect(deleteItems).toHaveBeenCalledWith([31], manager);
		expect(committed).toBe(false);
		finishRemoval();
		await clearing;
		expect(committed).toBe(true);
	});
});
