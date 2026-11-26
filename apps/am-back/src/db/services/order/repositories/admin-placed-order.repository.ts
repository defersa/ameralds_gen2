import { ModelState } from '@am-back/db/abstract/abstract.model';
import { UserPatternGrantEntity } from '@am-back/db/entities/patterns/user-pattern-grant.entity';
import { OrderStatus, UserOrderEntity } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus, UserPaymentEntity } from '@am-back/db/entities/purchases/payment.entity';
import { RefundIncidentEntity } from '@am-back/db/entities/purchases/refund-incident.entity';
import { RefundEntity } from '@am-back/db/entities/purchases/refund.entity';
import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, type EntityManager, IsNull, Not, Repository } from 'typeorm';
import type { AdminPlacedOrderFilters } from '../types/admin-placed-order-filters';


@Injectable()
export class AdminPlacedOrderRepository extends Repository<UserOrderEntity> {
    /** Подключает чтение пользовательских заказов; административные корзины не входят в этот репозиторий. */
    constructor(private readonly source: DataSource) {
        super(UserOrderEntity, source.createEntityManager());
    }

    /** Фильтрует и пагинирует оформленные заказы в БД; удалённый пользователь не исключает запись из истории. */
    public async page(
        filters: AdminPlacedOrderFilters,
    ): Promise<{ items: UserOrderEntity[]; page: number; count: number; total: number }> {
        // Загружаем только контакты владельца, без пароля и токенов; OPEN-корзины исключены при любых фильтрах.
        const query = this.createQueryBuilder('orders')
            .leftJoin('orders.user', 'customer')
            .addSelect(['customer.id', 'customer.email'])
            .where('orders.status <> :open', {
                open: OrderStatus.OPEN,
            });

        if (filters.statuses?.length) {
            query.andWhere('orders.status IN (:...statuses)', {
                statuses: filters.statuses,
            });
        }

        if (filters.user) {
            const search = filters.user.replace(/[\\%_]/g, '\\$&');
            const userId = /^\d+$/.test(filters.user) ? Number(filters.user) : null;

            query.andWhere(
                new Brackets((where) => {
                    where.where('customer.email ILIKE :email', {
                        email: `%${search}%`,
                    });

                    if (userId !== null && Number.isInteger(userId) && userId > 0 && userId <= 2147483647) {
                        where.orWhere('customer.id = :userId', { userId });
                    }
                }),
            );
        }

        if (filters.createdFrom) {
            // Date использует ту же сериализацию pg, что и createdAt; ISO-строка для timestamp теряет часовой пояс.
            query.andWhere('orders.createdAt >= :from', {
                from: new Date(filters.createdFrom),
            });
        }

        if (filters.createdBefore) {
            query.andWhere('orders.createdAt < :before', {
                before: new Date(filters.createdBefore),
            });
        }

        const total = await query.getCount();
        const count = Math.max(1, Math.ceil(total / filters.pageSize));
        const page = Math.min(filters.page, count);

        // Второй ключ ID стабилизирует порядок при одинаковых временах создания; take применяется на сервере.
        const items = await query
            .orderBy('orders.createdAt', 'DESC')
            .addOrderBy('orders.id', 'DESC')
            .skip((page - 1) * filters.pageSize)
            .take(filters.pageSize)
            .getMany();

        return {
            items,
            page,
            count,
            total,
        };
    }

    /** Читает оформленный заказ любой активности с историческими позициями и платежами; OPEN не выдаётся. */
    public details(
        id: number,
    ): Promise<{ order: UserOrderEntity; refunds: RefundEntity[]; incidents: RefundIncidentEntity[]; grants: UserPatternGrantEntity[] } | null> {
        return this.source.transaction('REPEATABLE READ', async (manager) => {
            // Единый snapshot исключает сочетание старого PAID с уже завершённым возвратом из соседнего commit.
            // Раздельная загрузка связей исключает декартово произведение позиций, размеров и платежей.
            const order = await manager.getRepository(UserOrderEntity).findOne({
                where: {
                    id,
                    status: Not(OrderStatus.OPEN),
                },
                relationLoadStrategy: 'query',
                relations: {
                    user: true,
                    sourceAdminOrder: true,
                    payments: true,
                    patterns: {
                        pattern: {
                            name: true,
                        },
                        sizes: {
                            size: true,
                        },
                    },
                },
            });

            if (!order) {
                return null;
            }

            order.patterns
                .sort((a, b) => a.id - b.id);
            order.payments
                .sort((a, b) => a.id - b.id);

            // Возвраты не фильтруются по активности; финансовая история сохраняется после закрытия заказа.
            const refunds = await manager.getRepository(RefundEntity)
                .find({
                    where: { orderId: id },
                    order: { id: 'ASC' },
                });
            // Учитываем все основания, включая цвет из другого заказа и административные выдачи.
            const grants = order.user
                ? await manager.getRepository(UserPatternGrantEntity).findBy({
                      userId: order.user.id,
                      revokedAt: IsNull(),
                  })
                : [];

            // Расхождения провайдера сохраняются независимо от активности заказа и блокируют новый возврат.
            const incidents = await manager.getRepository(RefundIncidentEntity).find({
                where: { orderId: id },
                order: { id: 'ASC' },
            });

            order.refunds = refunds;

            return {
                order,
                refunds,
                incidents,
                grants,
            };
        });
    }

    /** Атомарно меняет только ожидающий оплаты активный заказ; блокировки пользователя и заказа уже удерживаются. */
    public async cancel(
        id: number,
        actorId: number,
        reason: string,
        now: Date,
        manager: EntityManager,
    ): Promise<boolean> {
        // Состояние проверяется повторно в UPDATE, чтобы устаревшая страница не отменила оплату.
        const result = await manager.getRepository(UserOrderEntity).update(
            {
                id,
                status: OrderStatus.PENDING_PAYMENT,
                state: ModelState.ACTIVE,
            },
            {
                status: OrderStatus.CANCELLED,
                cancelledAt: now,
                cancelReason: reason,
                cancelledBy: actorId,
                updatedAt: now,
            },
        );

        return result.affected === 1;
    }

    /** Блокирует ожидающие попытки после строки заказа; результат нужен для надёжной отмены после commit. */
    public pendingPayments(orderId: number, manager: EntityManager): Promise<UserPaymentEntity[]> {
        // Резервы без externalId тоже отменяются: сверка восстановит их прежним ключом идемпотентности.
        return manager.getRepository(UserPaymentEntity)
            .find({
                where: {
                    orderId,
                    status: PaymentStatus.PENDING,
                },
                order: { id: 'ASC' },
                lock: { mode: 'pessimistic_write' },
            });
    }
}
