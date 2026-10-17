import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FindOneOptions, In, Repository, SelectQueryBuilder } from 'typeorm';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { DataSourceService } from '../../data-source.service';
import { PatternOrdersService } from '@am-back/db/service/patterns/pattern-orders.service';
import { InputShortOrderPatternDto } from '../../../modules/orders/dto/orders.dto';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { ModelState } from '../../abstract/abstract.model';
import {
    AdminOrderListDto,
    AdminOrderResponseDto,
    AdminOrdersPaginatedPageDto,
    CompleteAdminOrderDto,
} from '../../../modules/admin/admin.dto';
import { AdminOrderMailService } from './admin-order-mail.service';
import {
    getOrderPrice,
    prepareCartPattern,
} from '@am-back/db/service/order/order.utils';
import {
    ApiEntityNames,
    ApiErrorCodes,
} from '../../../modules/errors/errors.dto';


export interface AdminOrdersPaginatedFilters {
    email?: string;
    vk?: string;
    startDate?: Date;
    endDate?: Date;
}

type AdminOrderIdRow = {
    id: number | string;
}

@Injectable()
export class AdminOrderService {
    private adminOrderRepository: Repository<AdminOrderEntity>;

    constructor(
        private dataSource: DataSourceService,
        private patternOrdersService: PatternOrdersService,
        private adminOrderMailService: AdminOrderMailService,
    ) {
        this.adminOrderRepository =
            this.dataSource.getRepository<AdminOrderEntity>(AdminOrderEntity);
    }

    public async paginatedAdminOrder(
        page: number,
        filters: AdminOrdersPaginatedFilters = {},
    ): Promise<AdminOrdersPaginatedPageDto> {
        const take: number = 10;
        const skip: number = take * (page - 1);
        const [ids, total]: [number[], number] = await Promise.all([
            this.getPaginatedAdminOrderIds(filters, take, skip),
            this.getFilteredAdminOrdersQuery(filters).getCount(),
        ]);

        return {
            page,
            count: Math.ceil(total / take),
            items: await this.getAdminOrdersPageByIds(ids),
        };
    }

    public async getActualCart(): Promise<AdminOrderResponseDto> {
        const lastAdminOrder: AdminOrderEntity[] =
            await this.adminOrderRepository.find({
                where: {
                    isComplete: false,
                    state: ModelState.ACTIVE,
                },
                order: {
                    createdAt: 'DESC',
                    id: 'DESC',
                },
            });

        const inactiveAdminOrders: AdminOrderEntity[] = lastAdminOrder.slice(1);

        inactiveAdminOrders.forEach(
            (order: AdminOrderEntity) => (order.state = ModelState.INACTIVE),
        );

        if (inactiveAdminOrders.length) {
            await this.adminOrderRepository.save(inactiveAdminOrders);
        }

        if (!lastAdminOrder[0]) {
            const order: AdminOrderEntity =
                await this.adminOrderRepository.save(
                    this.adminOrderRepository.create({
                        email: '',
                        isComplete: false,
                    }),
                );

            return {
                order,
                price: getOrderPrice(order.patterns ?? []),
            };
        }

        const order: AdminOrderEntity = await this.getCart();

        return {
            order,
            price: getOrderPrice(order.patterns ?? []),
        };
    }

    public async addToCart(
        pattern: InputShortOrderPatternDto,
    ): Promise<AdminOrderResponseDto> {
        const order: AdminOrderEntity = await this.getCart();
        const prepared: InputShortOrderPatternDto = prepareCartPattern(pattern);

        if (!prepared) {
            throw new HttpException(
                { code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART },
                HttpStatus.BAD_REQUEST,
            );
        }

        let patterns: OrderPatternEntity[] = [...order.patterns];
        const previousItem: OrderPatternEntity = patterns.find(
            (item: OrderPatternEntity) => item.pattern.id === pattern.pattern,
        );

        if (previousItem) {
            await this.patternOrdersService.removeOrderPatter(previousItem);
            patterns = patterns.filter(
                (item: OrderPatternEntity) =>
                    item.pattern.id !== pattern.pattern,
            );
        }

        const newOrderPatternEntity: OrderPatternEntity =
            await this.patternOrdersService.createOrderPattern(
                prepared,
                { adminOrder: order },
            );

        patterns.push(newOrderPatternEntity);
        order.patterns = patterns;
        await this.adminOrderRepository.save(order);

        const updatedCart: AdminOrderEntity = await this.getCart();

        return {
            order: updatedCart,
            price: getOrderPrice(updatedCart.patterns),
        };
    }

    public async removeFromCart(id: number): Promise<AdminOrderResponseDto> {
        const order: AdminOrderEntity = await this.getCart();

        let patterns: OrderPatternEntity[] = [...order.patterns];
        const previousItem: OrderPatternEntity = order.patterns.find(
            (item: OrderPatternEntity) => item.pattern.id === id,
        );

        if (previousItem) {
            await this.patternOrdersService.removeOrderPatter(previousItem);
            patterns = patterns.filter(
                (item: OrderPatternEntity) => item.pattern.id !== id,
            );
        }

        order.patterns = patterns;
        await this.adminOrderRepository.save(order);

        const updatedCart: AdminOrderEntity = await this.getCart();

        return {
            order: updatedCart,
            price: getOrderPrice(updatedCart.patterns),
        };
    }

    public async clearCart(): Promise<void> {
        const order: AdminOrderEntity = await this.getCart();

        order.patterns.forEach((pattern: OrderPatternEntity) =>
            this.patternOrdersService.removeOrderPatter(pattern),
        );

        order.patterns = [];
        await this.adminOrderRepository.save(order);

        return null;
    }

    public async completeOrder(
        details: CompleteAdminOrderDto = {},
    ): Promise<AdminOrderResponseDto> {
        const { completedOrder, newOrder } =
            await this.dataSource.dataSource.transaction(async (manager) => {
                const repository = manager.getRepository(AdminOrderEntity);
                const order = await this.getCart(repository, {
                    mode: 'pessimistic_write',
                });

                if (!order) {
                    throw new HttpException(
                        { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
                        HttpStatus.BAD_REQUEST,
                    );
                }

                if (details.email !== undefined) {
                    order.email = details.email;
                }

                if (details.vk !== undefined) {
                    order.vk = details.vk;
                }

                order.isComplete = true;
                const completedOrder = await repository.save(order);
                const newOrder = await repository.save(
                    repository.create({
                        email: '',
                        isComplete: false,
                        patterns: [],
                    }),
                );

                return { completedOrder, newOrder };
            });

        await this.adminOrderMailService.sendCompletedOrder(completedOrder);

        return {
            order: newOrder,
            price: getOrderPrice(newOrder.patterns ?? []),
        };
    }

    private async getPaginatedAdminOrderIds(
        filters: AdminOrdersPaginatedFilters,
        take: number,
        skip: number,
    ): Promise<number[]> {
        const rows: AdminOrderIdRow[] = await this.getFilteredAdminOrdersQuery(filters)
            .select('adminOrder.id', 'id')
            .addSelect('adminOrder.createdAt', 'createdAt')
            .orderBy('adminOrder.createdAt', 'DESC')
            .addOrderBy('adminOrder.id', 'DESC')
            .limit(take)
            .offset(skip)
            .getRawMany<AdminOrderIdRow>();

        return rows.map((row: AdminOrderIdRow) => Number(row.id));
    }

    private async getAdminOrdersPageByIds(ids: number[]): Promise<AdminOrderListDto[]> {
        if (!ids.length) {
            return [];
        }

        const orders: AdminOrderEntity[] = await this.adminOrderRepository.find({
            where: {
                id: In(ids),
                state: ModelState.ACTIVE,
                isComplete: true,
            },
            relations: {
                patterns: {
                    pattern: {
                        name: true,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                vk: true,
                isComplete: true,
                createdAt: true,
                updatedAt: true,
                patterns: {
                    id: true,
                    pattern: {
                        id: true,
                        name: {
                            id: true,
                            ru: true,
                            en: true,
                        },
                    },
                },
            },
            order: {
                patterns: {
                    id: 'ASC',
                },
            },
        });
        const ordersById: Map<number, AdminOrderEntity> = new Map(
            orders.map((order: AdminOrderEntity) => [order.id, order]),
        );

        return ids
            .map((id: number) => ordersById.get(id))
            .filter((order: AdminOrderEntity | undefined): order is AdminOrderEntity => Boolean(order))
            .map((order: AdminOrderEntity) => ({
                id: order.id,
                email: order.email,
                vk: order.vk,
                isComplete: order.isComplete,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                patterns: (order.patterns ?? []).map((item: OrderPatternEntity) => ({
                    name: item.pattern?.name
                        ? { ru: item.pattern.name.ru, en: item.pattern.name.en }
                        : null,
                })),
            }));
    }

    private getFilteredAdminOrdersQuery(
        filters: AdminOrdersPaginatedFilters,
    ): SelectQueryBuilder<AdminOrderEntity> {
        const queryBuilder: SelectQueryBuilder<AdminOrderEntity> = this.adminOrderRepository
            .createQueryBuilder('adminOrder')
            .where('adminOrder.state = :state', { state: ModelState.ACTIVE })
            .andWhere('adminOrder.isComplete = :isComplete', { isComplete: true });

        if (filters.email?.trim()) {
            queryBuilder.andWhere('adminOrder.email ILIKE :email', {
                email: `%${filters.email.trim()}%`,
            });
        }

        if (filters.vk?.trim()) {
            queryBuilder.andWhere('adminOrder.vk ILIKE :vk', {
                vk: `%${filters.vk.trim()}%`,
            });
        }

        if (filters.startDate) {
            queryBuilder.andWhere('adminOrder.createdAt >= :startDate', {
                startDate: filters.startDate,
            });
        }

        if (filters.endDate) {
            queryBuilder.andWhere('adminOrder.createdAt <= :endDate', {
                endDate: filters.endDate,
            });
        }

        return queryBuilder;
    }

    private async getCart(
        repository: Repository<AdminOrderEntity> = this.adminOrderRepository,
        lock?: FindOneOptions<AdminOrderEntity>['lock'],
    ): Promise<AdminOrderEntity> {
        return repository.findOne({
            where: {
                isComplete: false,
                state: ModelState.ACTIVE,
            },
            order: {
                createdAt: 'DESC',
                id: 'DESC',
            },
            lock,
            // Load relations separately so PostgreSQL only locks the order row.
            relationLoadStrategy: lock ? 'query' : 'join',
            relations: {
                patterns: {
                    sizes: {
                        size: true,
                    },
                    pattern: {
                        basePrice: true,
                        additionalPrice: true,
                        colorPrice: true,
                    },
                },
            },
        });
    }
}
