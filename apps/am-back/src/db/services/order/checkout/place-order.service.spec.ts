import { ModelState } from "@am-back/db/abstract/abstract.model";
import { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "@am-back/db/entities/patterns/pattern-size.entity";
import { PatternEntity } from "@am-back/db/entities/patterns/pattern.entity";
import { SizeEntity } from "@am-back/db/entities/patterns/size.entity";
import { UserOrderEntity, OrderStatus } from "@am-back/db/entities/purchases/order.entity";
import { AppSettingsService } from "@am-back/db/service/app-settings/app-settings.service";
import type { OwnedPatternSelection } from "@am-back/db/service/general/pattern-purchase";
import { UserPatternService } from "@am-back/db/service/general/user-pattern.service";
import { DataSource } from "typeorm";
import { testService } from "../../../../../test/feature-services";
import { cartRevision } from "../cart/cart-revision";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { OrderCheckoutService } from "./order-checkout.service";
import { PlaceOrderService } from "./place-order.service";


describe("PlaceOrderService", () => {
	let service: PlaceOrderService;
	let cart: UserOrderEntity;
	let bought: OwnedPatternSelection[];
	let fixSnapshots: jest.Mock;
	let fixAmounts: jest.Mock;
	let fixPaymentWindow: jest.Mock;
	let lockOwner: jest.Mock;
	let find: jest.Mock;
	const now = new Date("2026-11-04T12:00:00Z");

	beforeEach(async () => {
		const pattern = Object.assign(new PatternEntity(), {
			id: 7,
			state: ModelState.ACTIVE,
			hidden: false,
			name: { ru: "Схема", en: "Pattern" },
			basePrice: { ru: 100, en: 2 },
			additionalPrice: { ru: 20, en: 1 },
		});

		cart = Object.assign(new UserOrderEntity(), {
			id: 17,
			status: OrderStatus.OPEN,
			state: ModelState.ACTIVE,
			patterns: [Object.assign(new OrderPatternEntity(), {
				id: 9,
				state: ModelState.ACTIVE,
				pattern,
				sizes: [Object.assign(new PatternSizeEntity(), {
					id: 31,
					pattern,
					state: ModelState.ACTIVE,
					size: Object.assign(new SizeEntity(), { id: 1, value: 36, state: ModelState.ACTIVE }),
				})],
				color: false,
				requiresPatternPurchase: true,
			})],
		});
		bought = [];
		fixSnapshots = jest.fn(async (items, snapshots) => {
			items.forEach((item, index: number) => { item.snapshot = snapshots[index]; });
		});
		fixAmounts = jest.fn(async (_id, amounts) => { Object.assign(cart, amounts); });
		fixPaymentWindow = jest.fn(async (_id, expires, version, _manager, placedAt) => {
			Object.assign(cart, { status: OrderStatus.PENDING_PAYMENT, paymentExpiresAt: expires, appSettingsVersion: version, placedAt });
		});
		lockOwner = jest.fn();
		find = jest.fn(async (id: number, owner: number) => id === cart.id && owner === 42 ? cart : null);

		service = await testService(PlaceOrderService, [
			OrderCheckoutService,
			{ provide: DataSource, useValue: { transaction: async (work) => work({ queryRunner: { isTransactionActive: true } }) } },
			{ provide: UserOrderRepository, useValue: {
				lockOwner, lockForSnapshot: find, lockForPayment: find, fixAmounts, fixPaymentWindow,
				databaseTime: jest.fn(async () => now),
			} },
			{ provide: OrderPatternRepository, useValue: { fixSnapshots } },
			{ provide: UserPatternService, useValue: { getBoughtSelections: jest.fn(async () => bought) } },
			{ provide: AppSettingsService, useValue: { current: jest.fn(async () => ({ version: 3, effective: { orders: { paymentExpirationDays: 7 } } })) } },
		]);
	});

	it("fixes current prices, composition and payment window without accepting client amounts", async () => {
		const result = await service.place(42, { cartId: 17, cartRevision: cartRevision(cart), currency: "RUB" });

		expect(result).toMatchObject({
			id: 17, status: OrderStatus.PENDING_PAYMENT, subtotalAmount: 12000, discountAmount: 0, totalAmount: 12000,
			currency: "RUB", discounts: [], appSettingsVersion: 3, placedAt: now,
			paymentExpiresAt: new Date("2026-11-11T12:00:00Z"),
		});
		expect(result.patterns[0].snapshot).toMatchObject({ name: { ru: "Схема" }, sizes: [{ sizeId: 1 }], totalAmount: 12000 });
		expect(result).not.toHaveProperty("user");
		expect(lockOwner).toHaveBeenCalledWith(42, expect.anything());
	});

	it("returns the same snapshot on repeated checkout without changing price or payment deadline", async () => {
		const input = { cartId: 17, cartRevision: cartRevision(cart), currency: "RUB" as const };
		const first = await service.place(42, input);

		cart.patterns[0].pattern.basePrice.ru = 999;
		bought = [{ patternId: 7, sizeIds: [1], color: true }];

		const repeated = await service.place(42, input);

		expect(repeated).toEqual(first);
		expect(fixPaymentWindow).toHaveBeenCalledTimes(1);
		expect(fixSnapshots).toHaveBeenCalledTimes(1);
	});

	it.each(["owned", "hidden", "inactive size", "color", "revision"])("returns conflicts without writing snapshots for %s", async (scenario) => {
		const input = { cartId: 17, cartRevision: cartRevision(cart), currency: "RUB" as const };

		if (scenario === "owned") {
			bought = [{ patternId: 7, sizeIds: [1], color: false }];
		}

		if (scenario === "hidden") {
			cart.patterns[0].pattern.hidden = true;
		}

		if (scenario === "inactive size") {
			cart.patterns[0].sizes[0].state = ModelState.INACTIVE;
		}

		if (scenario === "color") {
			cart.patterns[0].color = true;
		}

		if (scenario === "revision") {
			input.cartRevision = "a".repeat(64);
		}

		await expect(service.place(42, input)).rejects.toMatchObject({ response: { code: "CART_CONFLICT", items: [expect.objectContaining({ itemId: 9 })] } });
		expect(fixSnapshots).not.toHaveBeenCalled();
		expect(fixAmounts).not.toHaveBeenCalled();
		expect(cart.status).toBe(OrderStatus.OPEN);
	});

	it("rejects foreign and missing carts", async () => {
		await expect(service.place(99, { cartId: 17, cartRevision: cartRevision(cart), currency: "RUB" })).rejects.toMatchObject({ status: 400 });
		await expect(service.place(42, { cartId: 18, cartRevision: cartRevision(cart), currency: "RUB" })).rejects.toMatchObject({ status: 400 });
	});

	it("rejects empty carts", async () => {
		cart.patterns = [];

		await expect(service.place(42, { cartId: 17, cartRevision: cartRevision(cart), currency: "RUB" })).rejects.toMatchObject({ status: 400 });
		expect(fixSnapshots).not.toHaveBeenCalled();
	});
});
