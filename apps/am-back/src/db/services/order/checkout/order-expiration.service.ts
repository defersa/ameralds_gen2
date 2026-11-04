import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { UserOrderRepository } from "../repositories/user-order.repository";
import { PAYMENT_EXPIRED_REASON } from "./payment-window";


@Injectable()
export class OrderExpirationService {
	private readonly logger = new Logger(OrderExpirationService.name);

	/** Подключает репозиторий пользовательских заказов для периодической отмены просроченной оплаты. */
	constructor(private readonly orders: UserOrderRepository) {}

	/**
	 * Раз в минуту отменяет просроченные пользовательские заказы, логирует количество и возвращает число
	 * изменённых строк.
	 */
	@Cron(CronExpression.EVERY_MINUTE)
	public async cancelExpiredOrders(): Promise<number> {
		const cancelled = await this.orders.cancelExpired();

		if (cancelled > 0) {
			this.logger.log({
				cancelled,
				reason: PAYMENT_EXPIRED_REASON,
			});
		}

		return cancelled;
	}
}
