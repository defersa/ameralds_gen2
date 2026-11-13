import { ModelState } from '@am-back/db/abstract/abstract.model';
import { OrderPatternEntity } from '@am-back/db/entities/patterns/pattern-order.entity';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentEffectEntity } from '@am-back/db/entities/purchases/payment-effect.entity';
import { UserEntity } from '@am-back/db/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In, IsNull, Not, Repository } from 'typeorm';


@Injectable()
export class PaymentCompletionRepository extends Repository<UserOrderEntity> {
    /** Подключает атомарные изменения заказа и outbox; блокировку владельца обеспечивает вызывающий сервис. */
    constructor(source: DataSource) {
        super(UserOrderEntity, source.createEntityManager());
    }

    /** Проверяет активность владельца под уже удерживаемой блокировкой пользователя. */
    public async isOwnerActive(userId: number, manager: EntityManager): Promise<boolean> {
        // Не выдаём новые права заблокированному пользователю, сохраняя списание для компенсации.
        return manager.getRepository(UserEntity).existsBy({
            id: userId,
            state: ModelState.ACTIVE,
        });
    }

    /** Сверяет оплаченные права с журналом под блокировкой владельца; пересечение требует финансового разрешения. */
    public async hasOverlappingRights(userId: number, orderId: number, manager: EntityManager): Promise<boolean> {
        // Читаем только snapshot покупки: изменение каталога не должно менять оплаченный состав.
        const items = await manager.getRepository(OrderPatternEntity).findBy({
            order: { id: orderId },
        });
        // Все эффективные основания владельца читаются в той же транзакции, что и выдача прав.
        const grants = await manager.getRepository(UserPatternGrantEntity).findBy({
            userId,
            revokedAt: IsNull(),
        });

        return items
            .some((item) => item.snapshot && grants
                .some((grant) => grant.patternId === item.snapshot?.patternId &&
                    ((grant.rightKey === 'color' && item.snapshot.color) || item.snapshot.sizes
                        .some((size) => grant.patternSizeId === size.patternSizeId))));
    }

    /** Фиксирует PAID перед выдачей прав, сохраняя стоимость и состав неизменными. */
    public async markPaid(order: UserOrderEntity, paidAt: Date, manager: EntityManager): Promise<void> {
        // Строка заказа и владелец уже заблокированы; обновление входит в общую транзакцию оплаты.
        await manager.getRepository(UserOrderEntity).update(order.id, {
            status: OrderStatus.PAID,
            paidAt,
        });
        order.status = OrderStatus.PAID;
        order.paidAt = paidAt;
    }

    /** Отменяет все остальные ожидающие заказы владельца независимо от состава и возвращает их ID. */
    public async cancelOtherOrders(userId: number, orderId: number, now: Date, manager: EntityManager): Promise<number[]> {
        // Блокировка владельца сериализует checkout, создание попыток и конкурирующие подтверждения.
        const others = await manager.getRepository(UserOrderEntity).find({
            where: {
                user: { id: userId },
                id: Not(orderId),
                status: OrderStatus.PENDING_PAYMENT,
            },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write' },
        });

        const ids = others
            .map((order) => order.id);

        if (ids.length) {
            // Сохраняем snapshot и явную причину отмены, запрещая новые платёжные попытки этих заказов.
            await manager.getRepository(UserOrderEntity).update({ id: In(ids) }, {
                status: OrderStatus.CANCELLED,
                cancelledAt: now,
                cancelReason: 'another_order_paid',
            });
        }

        return ids;
    }

    /** Полностью очищает текущую OPEN-корзину без изменения оплаченного snapshot; требует блокировки владельца. */
    public async clearOpenCart(userId: number, manager: EntityManager): Promise<void> {
        // Корзина может отсутствовать; чтение не создаёт её и не затрагивает исторические заказы.
        const cart = await manager.getRepository(UserOrderEntity).findOneBy({
            user: { id: userId },
            status: OrderStatus.OPEN,
            state: ModelState.ACTIVE,
        });

        if (cart) {
            // Загружаем позиции до удаления: remove удаляет junction-строки размеров до родительских записей.
            const items = await manager.getRepository(OrderPatternEntity).findBy({
                order: { id: cart.id },
            });

            // В отличие от DELETE, remove учитывает прежние FK с SET NULL на обязательных junction-колонках.
            await manager.getRepository(OrderPatternEntity).remove(items);
            // Инвалидируем ревизию корзины даже при пустом составе.
            await manager.getRepository(UserOrderEntity).update(cart.id, { updatedAt: new Date() });
        }
    }

    /** Добавляет внешний эффект один раз в текущей транзакции; обработчик запускается только после коммита. */
    public async enqueue(
        kind: PaymentEffectEntity['kind'], orderId: number, paymentId: number | null, manager: EntityManager,
    ): Promise<void> {
        // Уникальный ключ защищает от повторной доставки webhook и потери ответа после успешного коммита.
        await manager.getRepository(PaymentEffectEntity).createQueryBuilder()
            .insert()
            .values({
                effectKey: `${kind}:${paymentId ?? orderId}`,
                kind,
                orderId,
                paymentId,
            })
            .orIgnore()
            .execute();
    }
}
