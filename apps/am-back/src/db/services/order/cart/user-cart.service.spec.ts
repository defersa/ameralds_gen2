import { ModelState } from "@am-back/db/abstract/abstract.model";
import { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "@am-back/db/entities/patterns/pattern-size.entity";
import { PatternEntity } from "@am-back/db/entities/patterns/pattern.entity";
import { SizeEntity } from "@am-back/db/entities/patterns/size.entity";
import { UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import type { OwnedPatternSelection } from "@am-back/db/service/general/pattern-purchase";
import { UserPatternService } from "@am-back/db/service/general/user-pattern.service";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { DataSource } from "typeorm";
import { testService } from "../../../../../test/feature-services";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { UserCartService } from "./user-cart.service";


describe("UserCartService normalization", () => {
	const pattern = Object.assign(new PatternEntity(), { id: 7, state: ModelState.ACTIVE, hidden: false });
	const sizes = [1, 2]
		.map((id) => Object.assign(new PatternSizeEntity(), {
			id: id + 10,
			state: ModelState.ACTIVE,
			size: Object.assign(new SizeEntity(), { id, state: ModelState.ACTIVE }),
		}));

	let owned: OwnedPatternSelection[];
	let cart: UserOrderEntity;
	let service: UserCartService;
	let lockOwner: jest.Mock;
	let deleteItems: jest.Mock;
	let insertSelection: jest.Mock;

	beforeEach(async () => {
		owned = [{ patternId: 7, sizeIds: [1], color: false }];
		cart = Object.assign(new UserOrderEntity(), { id: 5, patterns: [] });
		lockOwner = jest.fn();
		deleteItems = jest.fn();
		insertSelection = jest.fn(async (input, owner, pattern, selectedSizes) => Object.assign(new OrderPatternEntity(), {
			...input, id: 9, pattern, sizes: selectedSizes, state: ModelState.ACTIVE,
		}));

		service = await testService(UserCartService, [
			{ provide: UserOrderRepository, useValue: { lockOwner, ensureOpenCart: jest.fn(), findOpenCart: jest.fn(async () => cart) } },
			{ provide: OrderPatternRepository, useValue: {
				findSelectedPattern: jest.fn(async () => pattern),
				findSelectedSizes: jest.fn(async (_, ids: number[]) => sizes
					.filter((size) => ids.includes(size.size.id))),
				deleteItems, insertSelection,
			} },
			{ provide: UserPatternService, useValue: { getBoughtSelections: jest.fn(async () => owned) } },
			{ provide: PatternsService, useValue: {} },
			{ provide: DataSource, useValue: { transaction: async (work) => work({}) } },
		]);
	});

	it("keeps color-only purchases during merge and coalesces duplicate local entries", async () => {
		const result = await service.mergeLocalCartWithUserCart(42, [
			{ pattern: 7, sizes: [1], color: false, requiresPatternPurchase: true },
			{ pattern: 7, sizes: [], color: true, requiresPatternPurchase: true },
		]);

		expect(result.cart.patterns).toHaveLength(1);
		expect(result.cart.patterns[0]).toMatchObject({ sizes: [], color: true, requiresPatternPurchase: false });
		expect(result.correctedPatternIds).toEqual([7]);
		expect(insertSelection).toHaveBeenCalledTimes(1);
		expect(lockOwner).toHaveBeenCalledWith(42, {});
	});

	it("refreshes the cart after rights changed and removes a completely owned item", async () => {
		await service.addToUserCart(42, { pattern: 7, sizes: [2], color: true, requiresPatternPurchase: true });
		owned = [{ patternId: 7, sizeIds: [1, 2], color: true }];

		const result = await service.getUserCart(42);

		expect(result.cart.patterns).toEqual([]);
		expect(result.correctedPatternIds).toEqual([7]);
		expect(deleteItems).toHaveBeenCalledWith([9], {});
	});

	it("removes existing choices when the replacement is entirely owned", async () => {
		await service.addToUserCart(42, { pattern: 7, sizes: [2], color: false, requiresPatternPurchase: false });

		const result = await service.addToUserCart(42, { pattern: 7, sizes: [1], color: false, requiresPatternPurchase: false });

		expect(result.cart.patterns).toEqual([]);
	});

	it("rejects color without ownership when submitted sizes are not in the catalogue", async () => {
		owned = [];

		const result = await service.addToUserCart(42, { pattern: 7, sizes: [999], color: true, requiresPatternPurchase: false });

		expect(result.cart.patterns).toEqual([]);
		expect(insertSelection).not.toHaveBeenCalled();
	});

	it("allows buying revoked rights again and ignores the client base-purchase flag", async () => {
		owned = [];

		const result = await service.addToUserCart(42, { pattern: 7, sizes: [1], color: true, requiresPatternPurchase: false });

		expect(result.cart.patterns[0]).toMatchObject({ color: true, requiresPatternPurchase: true });
		expect(result.cart.patterns[0].sizes).toHaveLength(1);
	});
});
