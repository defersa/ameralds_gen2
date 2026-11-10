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
