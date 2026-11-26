import { RefundIncidentEntity, type RefundIncidentKind } from '@am-back/db/entities/purchases/refund-incident.entity';
import { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { UserPaymentEntity, PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import type { ProviderRefund } from '@am-back/db/service/payment/types/payment-provider';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, Repository } from 'typeorm';


@Injectable()
export class RefundDiscoveryRepository extends Repository<RefundIncidentEntity> {
    /** Подключает финансовые расхождения; операции и платежи читаются через тот же менеджер транзакции. */
    constructor(source: DataSource) {
        super(RefundIncidentEntity, source.createEntityManager());
    }

    /** Находит подтверждённый платёж текущего провайдера без фильтра активности исторического аудита. */
    public findPayment(provider: string, externalId: string): Promise<UserPaymentEntity | null> {
        // Связь владельца нужна до блокировок; принадлежность и сумма повторно проверяются под блокировкой.
        return this.manager.getRepository(UserPaymentEntity).findOne({
            where: { provider, externalId, status: PaymentStatus.SUCCEEDED },
            relations: { order: { user: true } },
        });
    }

    /** Блокирует исходный платёж после владельца и заказа, сохраняя общий порядок финансовых операций. */
    public lockPayment(id: number, manager: EntityManager): Promise<UserPaymentEntity> {
        // Внешние вызовы выполняются до транзакции и не удерживают эту блокировку.
        return manager.getRepository(UserPaymentEntity).findOneOrFail({
            where: { id },
            lock: { mode: 'pessimistic_write' },
        });
    }

    /** Сопоставляет внешний ID либо исходный UUID приложения после потери ответа создания возврата. */
    public findOperation(provider: string, result: ProviderRefund, manager: EntityManager): Promise<RefundEntity | null> {
        const localKey = result.idempotencyKey;
        const hasLocalKey = localKey !== null && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(localKey);

        // Ключи вне формата UUID не передаются в uuid-колонку; для внешних операций достаточно внешнего ID.
        return manager.getRepository(RefundEntity).findOne({
            where: [
                { provider, externalId: result.externalId },
                ...(hasLocalKey ? [{ provider, idempotencyKey: localKey }] : []),
            ],
        });
    }

    /** Сохраняет исходные суммы расхождения; повтор обновляет время и статус, не понижая подтверждённый успех. */
    public async recordIncident(
        payment: UserPaymentEntity, result: ProviderRefund, kind: RefundIncidentKind, manager: EntityManager,
    ): Promise<void> {
        // Уникальный внешний ID сохраняет исходные суммы и привязку; поздний неуспех не перезаписывает подтверждённый успех.
        await manager.query(`INSERT INTO "users"."refund_incident"
            (order_id, payment_id, provider, external_id, amount, currency, provider_status, kind)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (provider, external_id) DO UPDATE SET
                last_observed_at = clock_timestamp(),
                provider_status = CASE WHEN refund_incident.provider_status = 'succeeded'
                    THEN 'succeeded' ELSE EXCLUDED.provider_status END`, [
            payment.orderId,
            payment.id,
            payment.provider,
            result.externalId,
            result.amount,
            result.currency,
            result.status,
            kind,
        ]);
    }

    /** Выбирает старые и новые успешные платежи равномерно, без возрастного отсечения внешних возвратов. */
    public duePayments(provider: string, limit: number): Promise<UserPaymentEntity[]> {
        // Сканируем и compensation_required: неожиданные возвраты такого платежа требуют инцидента, а не отзыва прав.
        return this.manager.getRepository(UserPaymentEntity).createQueryBuilder('payment')
            .where('payment.provider = :provider AND payment.status = :status', { provider, status: PaymentStatus.SUCCEEDED })
            .andWhere('payment.externalId IS NOT NULL AND payment.nextRefundCheckAt <= clock_timestamp()')
            .orderBy('payment.nextRefundCheckAt', 'ASC')
            .addOrderBy('payment.id', 'ASC')
            .take(limit)
            .getMany();
    }

    /** Атомарно арендует минуту для обхода возвратов одного платежа между экземплярами приложения. */
    public async claimPayment(id: number): Promise<boolean> {
        // Условный UPDATE защищает от параллельного сканирования без удержания транзакции во время HTTP.
        const result = await this.manager.getRepository(UserPaymentEntity).createQueryBuilder()
            .update()
            .set({ nextRefundCheckAt: () => "clock_timestamp() + interval '1 minute'" })
            .where('id = :id AND next_refund_check_at <= clock_timestamp()', { id })
            .execute();

        return result.affected === 1;
    }

    /** Планирует следующий полный обход через час; после ошибки остаётся минутная аренда для восстановления. */
    public async finishPayment(id: number): Promise<void> {
        // Финансовые поля платежа не изменяются; старые операции не выпадают из будущих обходов.
        await this.manager.getRepository(UserPaymentEntity).update(id, {
            nextRefundCheckAt: () => "clock_timestamp() + interval '1 hour'",
        });
    }
}
