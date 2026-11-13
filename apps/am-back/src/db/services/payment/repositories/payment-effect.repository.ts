import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentEffectEntity } from '@am-back/db/entities/purchases/payment-effect.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';


@Injectable()
export class PaymentEffectRepository extends Repository<PaymentEffectEntity> {
    /** Подключает долговечную очередь действий, записанную в транзакции оплаты. */
    constructor(private readonly source: DataSource) {
        super(PaymentEffectEntity, source.createEntityManager());
    }

    /** Забирает одно действие с арендой на пять минут; конкурирующие воркеры пропускают заблокированные строки. */
    public claim(): Promise<PaymentEffectEntity | null> {
        return this.source.transaction(async (manager) => {
            // Аренда коммитится до SMTP/API-запроса; падение процесса возвращает действие в очередь по истечении аренды.
            const effect = await manager.getRepository(PaymentEffectEntity).findOne({
                where: {
                    completedAt: IsNull(),
                    availableAt: LessThanOrEqual(new Date()),
                },
                order: {
                    availableAt: 'ASC',
                    id: 'ASC',
                },
                lock: {
                    mode: 'pessimistic_write',
                    onLocked: 'skip_locked',
                },
            });

            if (!effect) {
                return null;
            }

            effect.attempts++;
            effect.availableAt = new Date(Date.now() + 300_000);

            // Счётчик попыток служит fencing token: поздний воркер не завершит чужую новую аренду.
            return manager.getRepository(PaymentEffectEntity).save(effect);
        });
    }

    /** Завершает только собственную аренду после успешного внешнего действия. */
    public async complete(effect: PaymentEffectEntity): Promise<void> {
        // Условие по attempts исключает подтверждение после истечения и повторного захвата аренды.
        await this.update({
            id: effect.id,
            attempts: effect.attempts,
            completedAt: IsNull(),
        }, { completedAt: new Date() });
    }

    /** Оставляет неуспешный эффект в очереди с экспоненциальным повтором до часа. */
    public async retry(effect: PaymentEffectEntity): Promise<void> {
        const delay = Math.min(3_600_000, 30_000 * 2 ** Math.min(effect.attempts, 7));

        // Повтор не теряет действие и не перезаписывает результат другого воркера.
        await this.update({
            id: effect.id,
            attempts: effect.attempts,
            completedAt: IsNull(),
        }, {
            availableAt: new Date(Date.now() + delay),
        });
    }

    /** Загружает оплаченный заказ с адресатом и immutable snapshot для уведомления после коммита. */
    public findMailOrder(id: number): Promise<UserOrderEntity | null> {
        // Письмо не подтверждает оплату; оно отправляется только для уже зафиксированной успешной покупки.
        return this.source.getRepository(UserOrderEntity).findOne({
            where: {
                id,
                status: OrderStatus.PAID,
            },
            relations: {
                user: true,
                patterns: true,
            },
        });
    }
}
