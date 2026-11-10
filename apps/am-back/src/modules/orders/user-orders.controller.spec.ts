import { INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthGuard } from "../../core/guards/auth.guard";
import { UserOrderService } from "../../db/services/order/user/user-order.service";
import { UserOrdersController } from "./orders.controller";


describe("personal order access", () => {
	let app: INestApplication;

	const getUserOrder = jest.fn();
    const getUserOrders = jest.fn();

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [UserOrdersController],
			providers: [
				{
					provide: UserOrderService,
					useValue: { getUserOrder, getUserOrders },
				},
			],
		}).compile();

		app = module.createNestApplication();
		app.use((req, _res, next) => {
			if (req.headers["test-user"]) {
				req.user = {
					id: Number(req.headers["test-user"]),
				};
			}

			next();
		});
		app.useGlobalGuards(new AuthGuard(app.get(Reflector)));
		await app.listen(0, "127.0.0.1");
	});
	beforeEach(() => {
		jest.clearAllMocks();
		getUserOrder.mockResolvedValue({
			id: 17,
			patterns: [],
		});
	});
	afterAll(async () => {
		await app.close();
	});

	it("rejects anonymous requests before accessing an order", async () => {
		await request(app.getHttpServer()).get("/orders/17").expect(401);
		expect(getUserOrder).not.toHaveBeenCalled();
	});
	it("uses the authenticated user regardless of identifiers supplied by the client", async () => {
		await request(app.getHttpServer()).get("/orders/17?userId=999").set("test-user", "42").expect(200);
		expect(getUserOrder).toHaveBeenCalledWith(42, 17);
	});
    it('rejects an anonymous list request before reading orders', async () => {
        await request(app.getHttpServer()).get('/orders').expect(401);
        expect(getUserOrders).not.toHaveBeenCalled();
    });

    it('passes validated filters with the authenticated owner, ignoring a supplied userId', async () => {
        getUserOrders.mockResolvedValue({ page: 2, count: 3, items: [{ id: 17 }] });

        await request(app.getHttpServer())
            .get('/orders?page=2&status=success&minAmount=0&maxAmount=12345&userId=999')
            .set('test-user', '42')
            .expect(200, { page: 2, count: 3, items: [{ id: 17 }] });
        expect(getUserOrders).toHaveBeenCalledWith(42, expect.objectContaining({
            page: 2, status: 'success', minAmount: 0, maxAmount: 12345,
        }));
    });

    it.each([
        'page=0', 'page=1.5', 'page=2147483648', 'page=1&page=2',
        'status=open', 'status=unknown', 'minAmount=-1', 'minAmount=1.5',
        'minAmount=9007199254740992', 'minAmount=2&maxAmount=1',
        'createdFrom=invalid', 'createdFrom=2026-11-09', 'createdFrom=2026-02-30T00:00:00Z',
        'createdFrom=2026-11-10T00:00:00Z&createdBefore=2026-11-09T00:00:00Z',
    ])('rejects invalid filters: %s', async query => {
        await request(app.getHttpServer()).get(`/orders?${query}`).set('test-user', '42').expect(400);
        expect(getUserOrders).not.toHaveBeenCalled();
    });

});
