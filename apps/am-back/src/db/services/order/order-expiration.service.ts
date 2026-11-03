import { BadRequestException, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { OrderStatus, UserOrderEntity } from '../../entities/purchases/order.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { APP_SETTINGS_REGISTRY, effectiveSetting } from '../app-settings/app-settings.schema';

export const PAYMENT_EXPIRED_REASON = 'payment_expired';

@Injectable()
export class OrderExpirationService {
    constructor(private readonly source: DataSourceService, private readonly settings: AppSettingsService) {}

    /**
     * Точка интеграции checkout (AMS-9): вызывать после проверки и фиксации состава/цены,
     * в той же транзакции. Повторный вызов для того же pending не продлевает срок.
     */
    public async startPaymentWindow(orderId: number, userId: number, manager: EntityManager): Promise<UserOrderEntity> {
        if (!manager.queryRunner?.isTransactionActive) throw new Error('Checkout requires an active transaction');
        const repository = manager.getRepository(UserOrderEntity);
        const order = await repository.findOne({
            where: { id: orderId, user: { id: userId }, state: ModelState.ACTIVE },
            lock: { mode: 'pessimistic_write' },
            loadRelationIds: { relations: ['sourceAdminOrder'] },
        });
        if (!order || order.sourceAdminOrder != null) this.invalidOrder();
        if (order.status === OrderStatus.PENDING_PAYMENT) {
            if (!order.paymentExpiresAt || !order.appSettingsVersion) throw new Error('Pending order has no payment window');
            return order;
        }
        if (order.status !== OrderStatus.OPEN) this.invalidOrder();
        const settings = await this.settings.current(manager);
        const days = effectiveSetting(settings.snapshot.orders?.paymentExpirationDays, APP_SETTINGS_REGISTRY['orders.paymentExpirationDays']);
        // Время БД, а не часы backend-инстанса. 1 день = 24 часа, независимо от DST.
        const [{ now }]: { now: Date }[] = await manager.query('SELECT clock_timestamp() AS "now"');
        order.status = OrderStatus.PENDING_PAYMENT;
        order.paymentExpiresAt = new Date(new Date(now).valueOf() + days * 86_400_000);
        order.appSettingsVersion = settings.version;
        await repository.update(order.id, {
            status: order.status, paymentExpiresAt: order.paymentExpiresAt, appSettingsVersion: order.appSettingsVersion,
        });
        return order;
    }

    /**
     * UPDATE повторно проверяет status после ожидания блокировки конкурирующей оплаты.
     * Будущий PaymentService должен блокировать заказ ДО проверки провайдера и менять
     * только PENDING_PAYMENT в той же транзакции. CANCEL нельзя повторно открыть webhook-ом;
     * поздний успешный платёж потребует сверки/компенсации в платёжном контуре (AMS-12).
     */
    @Cron(CronExpression.EVERY_MINUTE)
    public async cancelExpiredOrders(): Promise<number> {
        const result = await this.source.getRepository(UserOrderEntity).createQueryBuilder()
            .update(UserOrderEntity)
            .set({ status: OrderStatus.CANCEL, cancelledAt: () => 'clock_timestamp()', cancelReason: PAYMENT_EXPIRED_REASON })
            .where('"status" = :status', { status: OrderStatus.PENDING_PAYMENT })
            .andWhere('"state" = :state', { state: ModelState.ACTIVE })
            .andWhere('"sourceAdminOrderId" IS NULL')
            .andWhere('"paymentExpiresAt" <= CURRENT_TIMESTAMP')
            .execute();
        return result.affected ?? 0;
    }

    private invalidOrder(): never {
        throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART });
    }
}
