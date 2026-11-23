import { ModelState } from '@am-back/db/abstract/abstract.model';
import { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { UserEntity, UserRole } from '@am-back/db/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In, Repository } from 'typeorm';


@Injectable()
export class RefundRepository extends Repository<RefundEntity> {
    /** Подключает журнал возвратов и источник для поиска владельца перед блокировкой. */
    constructor(source: DataSource) {
        super(RefundEntity, source.createEntityManager());
    }

    /** Находит владельца заказа до начала транзакции; после блокировки принадлежность проверяется повторно. */
    public async findOwnerId(orderId: number): Promise<number | null> {
        // Читаем лишь связь заказа и владельца; факт существования не даёт вызывающему права на возврат.
        const order = await this.manager.getRepository(UserOrderEntity).findOne({
            where: { id: orderId },
            relations: { user: true },
        });

        return order?.user?.id ?? null;
    }

    /** Проверяет действующую роль администратора по БД внутри транзакции принятия возврата. */
    public isAdministrator(actorId: number, manager: EntityManager): Promise<boolean> {
        // Клиентский идентификатор не является подтверждением роли или активности пользователя.
        return manager.getRepository(UserEntity).existsBy({ id: actorId, role: UserRole.ADMIN, state: ModelState.ACTIVE });
    }

    /** Читает действующий или успешно завершённый возврат под блокировкой заказа. */
    public findBlocking(orderId: number, manager: EntityManager): Promise<RefundEntity | null> {
        // Отказы остаются в журнале, но не мешают новой попытке; уникальный индекс защищает от гонки.
        return manager.getRepository(RefundEntity).findOneBy({
            orderId,
            status: In(['accepted', 'processing', 'unknown', 'succeeded']),
        });
    }

    /** Блокирует все подтверждённые платежи заказа для проверки однозначного источника возврата. */
    public successfulPayments(orderId: number, manager: EntityManager): Promise<UserPaymentEntity[]> {
        // Не скрываем неактивные и инцидентные списания: несколько успешных платежей требуют разбора.
        return manager.getRepository(UserPaymentEntity).find({
            where: { orderId, status: PaymentStatus.SUCCEEDED },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write' },
        });
    }

    /** Сохраняет начальную операцию в транзакции до первого внешнего запроса. */
    public reserve(value: Partial<RefundEntity>, manager: EntityManager): Promise<RefundEntity> {
        // Сумма и идентификатор платежа берутся из ранее проверенных записей, не из входа клиента.
        return manager.getRepository(RefundEntity).save(manager.getRepository(RefundEntity).create(value));
    }

    /** Атомарно назначает первичную отправку одному воркеру до внешнего вызова и записывает переход. */
    public async claimStart(id: number): Promise<boolean> {
        // Только accepted может быть отправлен впервые; после сбоя processing проверяется по исходному ключу.
        const result = await this.createQueryBuilder()
            .update(RefundEntity)
            .set({
                status: 'processing',
                nextCheckAt: () => "clock_timestamp() + interval '1 minute'",
                transitions: () => `"transitions" || jsonb_build_array(jsonb_build_object(
                    'status', 'processing', 'at', clock_timestamp(), 'error', NULL))`,
            })
            .where('id = :id AND status = :status', { id, status: 'accepted' })
            .execute();

        return result.affected === 1;
    }

    /** Загружает исходный платёж и запись финансовой операции для обращения к провайдеру. */
    public findForProcessing(id: number): Promise<RefundEntity | null> {
        // Провайдер и платёж сверяются повторно в обработчике результата до изменения прав.
        return this.findOne({ where: { id }, relations: { payment: true } });
    }

    /** Сопоставляет уведомление с ранее известным внешним ID и провайдером. */
    public findByExternal(provider: string, externalId: string): Promise<RefundEntity | null> {
        // Неизвестное уведомление не создаёт финансовую операцию; провайдер должен повторить доставку.
        return this.findOneBy({ provider, externalId });
    }

    /** Получает ограниченную порцию незавершённых операций для периодической сверки. */
    public due(limit: number): Promise<RefundEntity[]> {
        // План не зависит от срока жизни страницы покупателя или получения webhook.
        return this.createQueryBuilder('refund')
            .where('refund.status IN (:...statuses)', { statuses: ['accepted', 'processing', 'unknown'] })
            .andWhere('refund.nextCheckAt <= clock_timestamp()')
            .orderBy('refund.nextCheckAt', 'ASC')
            .addOrderBy('refund.id', 'ASC')
            .take(limit)
            .getMany();
    }

    /** Резервирует короткое окно сверки, чтобы параллельные воркеры не обращались к провайдеру одновременно. */
    public async claimCheck(id: number): Promise<boolean> {
        // Условный UPDATE не меняет терминальные операции и допускает восстановление после падения воркера.
        const result = await this.createQueryBuilder()
            .update(RefundEntity)
            .set({ nextCheckAt: () => "clock_timestamp() + interval '1 minute'" })
            .where('id = :id AND status IN (:...statuses)', { id, statuses: ['processing', 'unknown'] })
            .andWhere('next_check_at <= clock_timestamp()')
            .execute();

        return result.affected === 1;
    }

    /** Фиксирует неопределённость и повторную проверку, не перезаписывая успех или окончательный отказ. */
    public async markUnknown(id: number): Promise<void> {
        // Неизвестный ответ не означает отказа и не разрешает создание нового возврата или отзыв прав.
        await this.manager.query(`UPDATE "users"."refund" SET
            "transitions" = CASE WHEN "status" = 'unknown' THEN "transitions" ELSE
                "transitions" || jsonb_build_array(jsonb_build_object(
                    'status', 'unknown', 'at', clock_timestamp(), 'error', 'provider_unavailable')) END,
            "status" = 'unknown', "error_code" = 'provider_unavailable',
            "check_failures" = "check_failures" + 1,
            "next_check_at" = clock_timestamp() + interval '1 minute'
            WHERE "id" = $1 AND "status" IN ('processing', 'unknown')`, [id]);
    }
}
