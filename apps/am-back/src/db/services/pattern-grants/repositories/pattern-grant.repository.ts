import { ModelState } from '@am-back/db/abstract/abstract.model';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { UserEntity, UserRole } from '@am-back/db/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In, IsNull, Repository } from 'typeorm';


@Injectable()
export class PatternGrantRepository extends Repository<UserPatternGrantEntity> {
    /** Подключает журнал оснований прав; изменения выполняются только через транзакционный manager. */
    constructor(source: DataSource) {
        super(UserPatternGrantEntity, source.createEntityManager());
    }

    /** Блокирует владельца любой активности до заказа и прав, разрешая отзыв у деактивированных пользователей. */
    public lockOwner(userId: number, manager: EntityManager): Promise<UserEntity | null> {
        // Сериализуем выдачу/отзыв с корзиной и деактивацией; активность для новой выдачи проверяет сервис.
        return manager.getRepository(UserEntity).findOne({
            where: {
                id: userId,
            },
            lock: { mode: 'pessimistic_write' },
        });
    }

    /** Проверяет текущую роль администратора по БД, независимо от переданных вызывающим кодом ролей. */
    public isAdministrator(actorId: number, manager: EntityManager): Promise<boolean> {
        // Проверяем активность и роль автора отзыва, не доверяя входным данным о полномочиях.
        return manager.getRepository(UserEntity).existsBy({
            id: actorId,
            state: ModelState.ACTIVE,
            role: UserRole.ADMIN,
        });
    }

    /** Блокирует активный заказ владельца, затем отдельно читает позиции и источник без блокировки внешних JOIN. */
    public lockSourceOrder(userId: number, orderId: number, manager: EntityManager): Promise<UserOrderEntity | null> {
        // После пользователя блокируем только строку его заказа; состав читаем в той же транзакции.
        return manager.getRepository(UserOrderEntity).findOne({
            where: {
                id: orderId,
                user: { id: userId },
                state: ModelState.ACTIVE,
            },
            lock: { mode: 'pessimistic_write' },
            relationLoadStrategy: 'query',
            relations: {
                sourceAdminOrder: true,
                patterns: {
                    pattern: true,
                    sizes: { pattern: true },
                },
            },
        });
    }

    /** Вставляет основание один раз; конфликт не обновляет ранее отозванное право и не меняет его историю. */
    public async insertOnce(grant: Partial<UserPatternGrantEntity>, manager: EntityManager): Promise<void> {
        // Уникальные индексы позиции/legacy-основания и права обеспечивают идемпотентность повторной выдачи.
        await manager.getRepository(UserPatternGrantEntity)
            .createQueryBuilder()
            .insert()
            .values(grant)
            .orIgnore()
            .execute();
    }

    /** Читает явно выбранные основания владельца; область источника дополнительно проверяет доменный сервис. */
    public findSelected(userId: number, ids: number[], manager: EntityManager): Promise<UserPatternGrantEntity[]> {
        // Не допускаем подмешивания оснований другого пользователя в выборочный отзыв.
        return manager.getRepository(UserPatternGrantEntity).findBy({
            userId,
            id: In(ids),
        });
    }

    /** Возвращает все действующие основания одной схемы, независимо от состояния последнего заказа. */
    public findEffective(userId: number, patternId: number, manager: EntityManager): Promise<UserPatternGrantEntity[]> {
        // Доступ определяется объединением неотозванных оснований, а не статусом одной покупки.
        return manager.getRepository(UserPatternGrantEntity).findBy({
            userId,
            patternId,
            revokedAt: IsNull(),
        });
    }

    /** Фиксирует первый отзыв; повтор сохраняет исходные время, причину, автора и ссылку на возврат. */
    public async revokeOnce(ids: number[], actorId: number, reason: string, refundReference: string, manager: EntityManager): Promise<void> {
        // Обновляем только ещё действующие выбранные основания; блокировка владельца уже удерживается транзакцией.
        await manager.getRepository(UserPatternGrantEntity).update({
            id: In(ids),
            revokedAt: IsNull(),
        }, {
            revokedAt: () => 'clock_timestamp()',
            revokedBy: actorId,
            revokeReason: reason,
            refundReference,
        });
    }
}
