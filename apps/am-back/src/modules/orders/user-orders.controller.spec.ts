import { INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthGuard } from "../../core/guards/auth.guard";
import { UserOrderService } from "../../db/services/order/user/user-order.service";
import { UserOrdersController } from "./orders.controller";
import { CancelUserOrderService } from "../../db/services/order/user/cancel-user-order.service";


describe("personal order access", () => {
	let app: INestApplication;

	const getUserOrder = jest.fn();
    const getUserOrders = jest.fn();
    const cancel = jest.fn();

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [UserOrdersController],
			providers: [
				{
					provide: CancelUserOrderService,
					useValue: { cancel },
				},
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
        cancel.mockResolvedValue({ id: 17, status: 'cancel', cancelReason: 'user_cancelled' });
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

    it('rejects anonymous cancellations before accessing an order', async () => {
        await request(app.getHttpServer()).post('/orders/17/cancel').expect(401);
        expect(cancel).not.toHaveBeenCalled();
    });

    it('cancels using the authenticated owner and returns updated metadata with HTTP 200', async () => {
        await request(app.getHttpServer())
            .post('/orders/17/cancel?userId=999')
            .set('test-user', '42')
            .send({ userId: 999, status: 'success' })
            .expect(200, { id: 17, status: 'cancel', cancelReason: 'user_cancelled' });
        expect(cancel).toHaveBeenCalledWith(42, 17);
    });

    it('rejects a malformed cancellation ID before accessing an order', async () => {
        await request(app.getHttpServer()).post('/orders/invalid/cancel').set('test-user', '42').expect(400);
        expect(cancel).not.toHaveBeenCalled();
    });
    it('rejects an anonymous list request before reading orders', async () => {
        await request(app.getHttpServer()).get('/orders').expect(401);
        expect(getUserOrders).not.toHaveBeenCalled();
    });

    it('passes validated filters with the authenticated owner, ignoring a supplied userId', async () => {
        const order = {
            id: 17,
            createdAt: '2026-11-09T12:00:00.000Z',
            updatedAt: '2026-11-09T12:00:00.000Z',
            placedAt: '2026-11-09T12:00:00.000Z',
            status: 'success',
            subtotalAmount: 12345,
            discountAmount: 0,
            totalAmount: 12345,
            currency: 'RUB',
            paymentExpiresAt: null,
            paidAt: '2026-11-09T12:00:00.000Z',
            cancelledAt: null,
            cancelReason: null,
            appSettingsVersion: null,
        };

        getUserOrders.mockResolvedValue({ page: 2, count: 3, items: [order] });

        await request(app.getHttpServer())
            .get('/orders?page=2&status=success&minAmount=0&maxAmount=12345&userId=999')
            .set('test-user', '42')
            .expect(200, { page: 2, count: 3, items: [order] });
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
