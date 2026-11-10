import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { ModelState } from "@am-back/db/abstract/abstract.model";
import { OrderPatternEntity } from "@am-back/db/entities/patterns/pattern-order.entity";
import { PatternSizeEntity } from "@am-back/db/entities/patterns/pattern-size.entity";
import { PatternEntity } from "@am-back/db/entities/patterns/pattern.entity";
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from "@am-back/db/entities/purchases/order.entity";
import { PatternGrantsService } from "@am-back/db/service/pattern-grants/pattern-grants.service";
import { UserService } from "@am-back/db/service/user.service";
import { DataSource, Not } from "typeorm";
import { repositoryFixture, testService } from "../../../../../test/feature-services";
import { AdminOrderRepository } from "../repositories/admin-order.repository";
import { OrderPatternRepository } from "../repositories/order-pattern.repository";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { UserOrderService } from "./user-order.service";


describe("UserOrderService.getUserOrder", () => {
	it("requests an active placed order belonging to the current user and excludes OPEN carts", async () => {
		const findOne = jest.fn().mockResolvedValue(null);

		const service = await testService(UserOrderService, [
			{
				provide: AdminOrderRepository,
				useValue: {},
			},
			{
				provide: OrderPatternRepository,
				useValue: {},
			},
			{
				provide: UserService,
				useValue: {},
			},
			{
				provide: PatternGrantsService,
				useValue: {},
			},
			{
				provide: UserOrderRepository,
				useValue: repositoryFixture(UserOrderRepository, { findOne }),
			},
		]);

		await expect(service.getUserOrder(42, 17)).rejects.toMatchObject({
			status: 400,
			response: {
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.CART,
			},
		});
		expect(findOne).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: 17,
					user: { id: 42 },
					state: ModelState.ACTIVE,
					status: Not(OrderStatus.OPEN),
				},
			}),
		);
	});

	it("exposes only presentation fields and handles a deleted pattern", async () => {
		const stored = Object.assign(new UserOrderEntity(), {
			id: 17,
			status: OrderStatus.PAID,
			user: {
				id: 42,
				passwordHash: "secret",
			},
			sourceAdminOrder: { email: "private@example.com" },
			patterns: [
				Object.assign(new OrderPatternEntity(), {
					id: 31,
					state: ModelState.ACTIVE,
					pattern: null,
					color: true,
					sizes: [
						Object.assign(new PatternSizeEntity(), {
							id: 21,
							state: ModelState.ACTIVE,
							size: {
								id: 5,
								value: 36,
							},
							pdf: { path: "/private/file.pdf" },
						}),
					],
				}),
			],
		});

		const service = await testService(UserOrderService, [
			{
				provide: AdminOrderRepository,
				useValue: {},
			},
			{
				provide: OrderPatternRepository,
				useValue: {},
			},
			{
				provide: UserService,
				useValue: {},
			},
			{
				provide: PatternGrantsService,
				useValue: {},
			},
			{
				provide: UserOrderRepository,
				useValue: repositoryFixture(UserOrderRepository, {
					findOne: jest.fn(async () => stored),
				}),
			},
		]);

		const result = await service.getUserOrder(42, 17);

		expect(result).toMatchObject({
			id: 17,
			patterns: [
				{
					id: 31,
					name: null,
					images: [],
					color: true,
					sizes: [
						{
							id: 21,
							size: { value: 36 },
						},
					],
				},
			],
		});
		expect(JSON.stringify(result)).not.toContain("secret");
		expect(JSON.stringify(result)).not.toContain("/private/");
		expect(result).not.toHaveProperty("user");
		expect(result).not.toHaveProperty("sourceAdminOrder");
	});
});

describe("UserOrderService", () => {
	const runner = new DataSource({ type: "postgres" }).createQueryRunner();
	const manager = runner.manager;

	const sources = {
		findPurchaseSource: jest.fn(),
	};

	const orders = {
		findByAdminSource: jest.fn(),
		createAdminPurchase: jest.fn(),
		finishAdminPurchase: jest.fn(),
		databaseTime: jest.fn(),
	};

	const items = {
		copyAdminItems: jest.fn(),
	};

	const users = {
		getOrCreateBuyerId: jest.fn(),
	};

	const purchases = {
		grantPaidOrder: jest.fn(),
	};

	let service: UserOrderService;
	let source: AdminOrderEntity;
	let created: UserOrderEntity;

	beforeEach(async () => {
		jest.resetAllMocks();
		Object.defineProperty(runner, "isTransactionActive", {
			value: true,
			configurable: true,
		});
		source = Object.assign(new AdminOrderEntity(), {
			id: 1,
			email: "buyer@example.test",
			state: ModelState.ACTIVE,
			isComplete: true,
			patterns: [
				Object.assign(new OrderPatternEntity(), {
					id: 7,
					state: ModelState.ACTIVE,
					color: true,
					requiresPatternPurchase: true,
					sizes: [],
					pattern: Object.assign(new PatternEntity(), {
						id: 8,
						state: ModelState.ACTIVE,
						name: { ru: "Pattern" },
						basePrice: { ru: 10 },
						additionalPrice: { ru: 1 },
						colorPrice: { ru: 2 },
					}),
				}),
			],
		});
		created = Object.assign(new UserOrderEntity(), { id: 2 });
		sources.findPurchaseSource.mockResolvedValue(source);
		users.getOrCreateBuyerId.mockResolvedValue(42);
		orders.findByAdminSource.mockResolvedValue(null);
		orders.createAdminPurchase.mockResolvedValue(created);
		orders.databaseTime.mockResolvedValue(new Date("2026-11-04"));
		items.copyAdminItems.mockImplementation(async (_id, entries, snapshots) =>
			entries
				.map((item, index) => ({
					...item,
					id: 9,
					snapshot: snapshots[index],
				})),
		);
		service = await testService(UserOrderService, [
			{
				provide: AdminOrderRepository,
				useValue: sources,
			},
			{
				provide: UserOrderRepository,
				useValue: orders,
			},
			{
				provide: OrderPatternRepository,
				useValue: items,
			},
			{
				provide: UserService,
				useValue: users,
			},
			{
				provide: PatternGrantsService,
				useValue: purchases,
			},
		]);
	});

	it("fixes the price and copies rights inside the caller transaction without exposing an entity", async () => {
		await expect(service.createFromAdminOrder(1, manager)).resolves.toBe(2);
		expect(created).toMatchObject({
			status: OrderStatus.PAID,
			state: ModelState.ACTIVE,
			totalAmount: 1200,
			currency: "RUB",
			paidAt: new Date("2026-11-04"),
		});
		expect(orders.createAdminPurchase).toHaveBeenCalledWith(42, 1, manager);
		expect(purchases.grantPaidOrder).toHaveBeenCalledWith(42, 2, manager);
		expect(source.patterns[0]).not.toHaveProperty("snapshot");
		expect(orders.finishAdminPurchase).toHaveBeenCalledWith(created, manager);
	});

	it("uses the resolved passwordless buyer and does not rewrite an existing source purchase", async () => {
		users.getOrCreateBuyerId.mockResolvedValue(43);
		orders.findByAdminSource.mockResolvedValue({ id: 99 });
		await expect(service.createFromAdminOrder(1, manager)).resolves.toBe(99);
		expect(orders.createAdminPurchase).not.toHaveBeenCalled();
		expect(items.copyAdminItems).not.toHaveBeenCalled();
		expect(purchases.grantPaidOrder).not.toHaveBeenCalled();
	});

	it.each([undefined, null, ""])("skips account and purchase creation for a VK-only source (%s)", async (email) => {
		source.email = email;
		await expect(service.createFromAdminOrder(1, manager)).resolves.toBeNull();
		expect(users.getOrCreateBuyerId).not.toHaveBeenCalled();
		expect(orders.createAdminPurchase).not.toHaveBeenCalled();
	});

	it("rejects an unavailable source", async () => {
		sources.findPurchaseSource.mockResolvedValue(null);
		await expect(service.createFromAdminOrder(1, manager)).rejects.toMatchObject({
			status: 400,
			response: {
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			},
		});
		expect(users.getOrCreateBuyerId).not.toHaveBeenCalled();
	});

	it.each(["inactive", "missing"] as const)("rejects a %s transaction before accessing data", async (state) => {
		Object.defineProperty(runner, "isTransactionActive", {
			value: false,
			configurable: true,
		});

		const transactionManager = state === "missing" ? new DataSource({ type: "postgres" }).manager : manager;

		await expect(service.createFromAdminOrder(1, transactionManager)).rejects.toMatchObject({
			status: 400,
			response: {
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.CART,
			},
		});
		expect(sources.findPurchaseSource).not.toHaveBeenCalled();
		expect(orders.findByAdminSource).not.toHaveBeenCalled();
		expect(orders.createAdminPurchase).not.toHaveBeenCalled();
		expect(items.copyAdminItems).not.toHaveBeenCalled();
		expect(users.getOrCreateBuyerId).not.toHaveBeenCalled();
		expect(purchases.grantPaidOrder).not.toHaveBeenCalled();
	});

	it("keeps unknown prices for deleted patterns and excludes inactive selections from rights", async () => {
		source.patterns[0].pattern = null;
		source.patterns[0].state = ModelState.INACTIVE;
		await service.createFromAdminOrder(1, manager);
		expect(created).toMatchObject({
			totalAmount: null,
			currency: null,
		});
		expect(purchases.grantPaidOrder).toHaveBeenCalledWith(42, 2, manager);
	});

	it("propagates a rights failure to the transaction owner", async () => {
		const error = new Error("rights write failed");

		purchases.grantPaidOrder.mockRejectedValue(error);
		await expect(service.createFromAdminOrder(1, manager)).rejects.toBe(error);
	});
	it("maps a domain pricing error to the existing API error before writing a purchase", async () => {
		source.patterns[0].pattern.basePrice.ru = 0.001;
		await expect(service.createFromAdminOrder(1, manager)).rejects.toMatchObject({
			status: 400,
			response: {
				code: "INVALID",
				entity: "cart",
			},
		});
		expect(orders.createAdminPurchase).not.toHaveBeenCalled();
		expect(purchases.grantPaidOrder).not.toHaveBeenCalled();
	});
});
