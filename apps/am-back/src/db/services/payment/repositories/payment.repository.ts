import { UserPaymentEntity, PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import { PaymentRequestEntity } from '@am-back/db/entities/purchases/payment-request.entity';
import type { OrderCurrency } from '@am-back/db/entities/purchases/order-snapshot.model';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In, Repository } from 'typeorm';


@Injectable()
export class PaymentRepository extends Repository<UserPaymentEntity> {
    /** Подключает хранилище попыток; все методы изменения используют менеджер текущей транзакции. */
    constructor(source: DataSource) {
        super(UserPaymentEntity, source.createEntityManager());
    }

    /** Находит попытку вместе с владельцем для внутренних каналов; финансовая история не фильтруется по state. */
    public findForVerification(id: number): Promise<UserPaymentEntity | null> {
        // Авторизация пользовательского API выполняется отдельно до вызова провайдера.
        return this.findOne({
            where: { id },
            relations: {
                order: { user: true },
            },
        });
    }

    /** Разрешает webhook только в существующую пару провайдер/externalId; неизвестный ID не создаёт платёж. */
    public findByExternal(provider: string, externalId: string): Promise<UserPaymentEntity | null> {
        // Уникальный индекс предотвращает неоднозначное сопоставление внешнего платежа.
        return this.findOneBy({
            provider,
            externalId,
        });
    }

    /** Возвращает последнюю попытку заказа без legacy-записей; владелец проверяется вызывающим сервисом. */
    public latest(orderId: number): Promise<UserPaymentEntity | null> {
        // Историю попыток не выдаём клиенту; для страницы результата достаточно последней попытки.
        return this.findOne({
            where: { orderId },
            order: { id: 'DESC' },
        });
    }

    /** Выбирает активные внешние попытки отменённых заказов для создания outbox в общей транзакции. */
    public findPendingForOrders(orderIds: number[], manager: EntityManager): Promise<UserPaymentEntity[]> {
        if (!orderIds.length) {
            return Promise.resolve([]);
        }

        // Включаем резервы без externalId: после потерянного ответа отмена сначала восстанавливает ID по ключу.
        return manager.getRepository(UserPaymentEntity).findBy({
            orderId: In(orderIds),
            status: PaymentStatus.PENDING,
        });
    }

    /** Резервирует проверку на короткую аренду; параллельные вкладки и процессы не опрашивают одну попытку одновременно. */
    public async claimCheck(id: number, leaseMs: number): Promise<boolean> {
        // Условный UPDATE атомарно ограничивает частоту даже при нескольких экземплярах backend.
        const result = await this.createQueryBuilder()
            .update()
            .set({
                nextCheckAt: () => `clock_timestamp() + (${Math.max(1000, leaseMs)} * interval '1 millisecond')`,
                updatedAt: () => '"updatedAt"',
            })
            .where('id = :id AND next_check_at <= clock_timestamp()', { id })
            .execute();

        return result.affected === 1;
    }

    /** Выбирает ограниченную порцию сверки, включая неопределённые резервы и недавно отменённые попытки. */
    public dueChecks(provider: string, limit: number, terminalDays: number): Promise<UserPaymentEntity[]> {
        // Незавершённые платежи проверяем без ограничения возраста; отказ/отмену — в настраиваемом окне поздних списаний.
        return this.createQueryBuilder('payment')
            .where('payment.provider = :provider', { provider })
            .andWhere('payment.nextCheckAt <= clock_timestamp()')
            .andWhere(`(payment.status = :pending OR (payment.status = :succeeded AND payment.resolution IS NULL)
                OR (payment.status IN (:...terminal) AND payment.createdAt > clock_timestamp() - (:days * interval '1 day')))`, {
                pending: PaymentStatus.PENDING,
                succeeded: PaymentStatus.SUCCEEDED,
                terminal: [PaymentStatus.FAILED, PaymentStatus.CANCELLED],
                days: terminalDays,
            })
            .orderBy('payment.nextCheckAt', 'ASC')
            .take(limit)
            .getMany();
    }

    /** Планирует повтор после ошибки провайдера; финансовый статус и snapshot не изменяются. */
    public async deferCheck(id: number, failures: number): Promise<void> {
        const delayMs = Math.min(3_600_000, 30_000 * 2 ** Math.min(failures, 7));

        // Не трогаем updatedAt: окно сверки терминальных платежей считается от финансового изменения.
        await this.createQueryBuilder()
            .update()
            .set({
                checkFailures: failures,
                errorCode: 'verification_unavailable',
                nextCheckAt: () => `clock_timestamp() + (${delayMs} * interval '1 millisecond')`,
                updatedAt: () => '"updatedAt"',
            })
            .where('id = :id AND resolution IS NULL', { id })
            .execute();
    }

    /** Находит исходную попытку по глобальному ключу, включая завершённые и неактивные строки аудита. */
    public async findByKey(key: string, manager: EntityManager): Promise<UserPaymentEntity | null> {
        // Не фильтруем state: удаление из интерфейса не разрешает повторно списывать деньги по тому же ключу.
        const request = await manager.getRepository(PaymentRequestEntity).findOne({
            where: { idempotencyKey: key },
            relations: { payment: true },
        });

        return request?.payment ?? null;
    }

    /** Закрепляет клиентский UUID за попыткой, сохраняя идемпотентность разных вкладок после её завершения. */
    public async bindKey(key: string, paymentId: number, manager: EntityManager): Promise<void> {
        // Уникальный PK не позволяет одному UUID разрешиться в разные заказы при конкурентных запросах.
        await manager.getRepository(PaymentRequestEntity).insert({
            idempotencyKey: key,
            paymentId,
        });
    }

    /** Ищет попытку, запрещающую новое списание; вызывается после блокировки пользователя и заказа. */
    public findBlocking(orderId: number, manager: EntityManager): Promise<UserPaymentEntity | null> {
        // PENDING включает неопределённый результат таймаута; SUCCEEDED блокирует оплату до финализации заказа.
        return manager.getRepository(UserPaymentEntity).findOne({
            where: {
                orderId,
                status: In([PaymentStatus.PENDING, PaymentStatus.SUCCEEDED]),
            },
            order: { id: 'DESC' },
        });
    }

    /** Сохраняет денежный snapshot до вызова провайдера; уникальный индекс дополнительно защищает от параллельных попыток. */
    public async reserve(
        orderId: number,
        key: string,
        provider: string,
        amount: number,
        currency: OrderCurrency,
        manager: EntityManager,
    ): Promise<UserPaymentEntity> {
        // Внешний ID пока неизвестен; статус остаётся PENDING даже при последующей потере ответа провайдера.
        const payment = await manager.getRepository(UserPaymentEntity).save({
            orderId,
            idempotencyKey: key,
            provider,
            amount,
            currency,
            status: PaymentStatus.PENDING,
        });

        await this.bindKey(key, payment.id, manager);

        return payment;
    }

    /** Блокирует попытку после блокировок пользователя и заказа, чтобы устаревший ответ не перезаписал финальный. */
    public lock(id: number, manager: EntityManager): Promise<UserPaymentEntity> {
        // Финансовый аудит читается независимо от state и без JOIN под FOR UPDATE.
        return manager.getRepository(UserPaymentEntity).findOneOrFail({
            where: { id },
            lock: { mode: 'pessimistic_write' },
        });
    }

    /** Записывает только нормализованные поля сверки и результата, не изменяя финансовый snapshot попытки. */
    public async saveResult(payment: UserPaymentEntity, manager: EntityManager): Promise<UserPaymentEntity> {
        // Сохраняем ранее заблокированную строку; триггер БД не позволяет подменить сумму, ключ или владельца заказа.
        return manager.getRepository(UserPaymentEntity).save(payment);
    }

    /** Помечает неопределённый ответ безопасным кодом, сохраняя PENDING и ключ для последующего повтора. */
    public async recordError(id: number, code: string): Promise<void> {
        // Условный UPDATE не перезаписывает параллельно подтверждённый финансовый результат.
        await this.update(
            {
                id,
                status: PaymentStatus.PENDING,
            },
            { errorCode: code },
        );
    }
}
