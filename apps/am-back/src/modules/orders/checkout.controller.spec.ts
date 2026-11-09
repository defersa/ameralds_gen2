import { CheckoutConflictReason } from "@ameralds/utils";
import { type INestApplication, ConflictException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import request from "supertest";
import { AuthGuard } from "../../core/guards/auth.guard";
import { PlaceOrderService } from "../../db/services/order/checkout/place-order.service";
import { CheckoutController } from "./checkout.controller";


describe("checkout API", () => {
	let app: INestApplication;
	const place = jest.fn();
	const input = {
		cartId: 17,
		cartRevision: "a".repeat(64),
		currency: "RUB",
	};

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [CheckoutController],
			providers: [{ provide: PlaceOrderService, useValue: { place } }],
		}).compile();

		app = module.createNestApplication();
		app.use((req, _res, next) => {
			if (req.headers["test-user"]) {
				req.user = { id: Number(req.headers["test-user"]) };
			}

			next();
		});
		app.useGlobalGuards(new AuthGuard(app.get(Reflector)));
		await app.listen(0, "127.0.0.1");
	});

	beforeEach(() => {
		place.mockReset().mockResolvedValue({ id: 17, status: "pending_payment" });
	});

	afterAll(async () => {
		await app.close();
	});

	it("requires authentication", async () => {
		await request(app.getHttpServer()).post("/orders/checkout").send(input).expect(401);
		expect(place).not.toHaveBeenCalled();
	});

	it("uses the authenticated owner and returns the order", async () => {
		await request(app.getHttpServer()).post("/orders/checkout?userId=999").set("test-user", "42").send(input).expect(201);
		expect(place).toHaveBeenCalledWith(42, input);
	});

	it.each([
		{},
		{ ...input, cartId: 0 },
		{ ...input, cartId: 1.5 },
		{ ...input, cartId: "17" },
		{ ...input, currency: "EUR" },
		{ ...input, cartRevision: "invalid" },
		{ ...input, totalAmount: 1 },
		{ ...input, userId: 999 },
	])("rejects invalid checkout input %j", async (body) => {
		await request(app.getHttpServer()).post("/orders/checkout").set("test-user", "42").send(body).expect(400);
		expect(place).not.toHaveBeenCalled();
	});

	it("returns structured conflict positions", async () => {
		const conflict = {
			code: "CART_CONFLICT",
			entity: "cart",
			items: [{ itemId: 1, patternId: 7, reasons: [CheckoutConflictReason.SIZE_OWNED] }],
		};

		place.mockRejectedValue(new ConflictException(conflict));

		const response = await request(app.getHttpServer()).post("/orders/checkout").set("test-user", "42").send(input).expect(409);

		expect(response.body).toEqual(conflict);
	});

	it("documents input, result, authentication and conflicts", () => {
		const schema = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		const operation = schema.paths["/orders/checkout"].post;

		expect(operation.responses).toMatchObject({ "201": {}, "400": {}, "401": {}, "409": {} });
		expect(schema.components.schemas.CheckoutInputDto).toMatchObject({ required: ["cartId", "cartRevision", "currency"] });
		expect(schema.components.schemas.CheckoutOrderDto.properties).toHaveProperty("patterns");
	});
});
