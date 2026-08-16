import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceService } from '../../data-source.service';
import { CartDto, InputShortOrderPatternDto } from '../../../modules/orders/orders.dto';
import { PatternOrdersService } from '@am-back/db/service/patterns/pattern-orders.service';
import { AdminOrderEntity, OrderStatus, UserOrderEntity } from '../../entities/purchases/order.entity';
import { UserEntity } from '../../entities/user.entity';
import { OrderPatternEntity, UserPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { ModelState } from '../../abstract/abstract.model';
import { UserPatternService } from '@am-back/db/service/general/user-pattern.service';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { NumberEntityDto } from '../../../common/common.dto';
import { AdminOrderResponseDto } from '../../../modules/admin/admin.dto';


@Injectable()
export class OrderService {
    private adminOrderRepository: Repository<AdminOrderEntity>;
    private userOrderRepository: Repository<UserOrderEntity>;

    constructor(
        private dataSource: DataSourceService,
        private patternOrdersService: PatternOrdersService,
        private userPatternService: UserPatternService
    ) {
        this.adminOrderRepository = this.dataSource.getRepository<AdminOrderEntity>(AdminOrderEntity);
        this.userOrderRepository = this.dataSource.getRepository<UserOrderEntity>(UserOrderEntity);
    }

    public async createOrder(user: UserEntity): Promise<UserOrderEntity> {
        const order: UserOrderEntity = this.userOrderRepository.create({ user });

        return this.userOrderRepository.save(order);
    }

    public async getLastAdminOrder(): Promise<AdminOrderResponseDto> {
        const lastAdminOrder: AdminOrderEntity[] = await this.adminOrderRepository.find({
            where: {
                isComplete: false,
                state: ModelState.ACTIVE
            },
            order: {
                createdAt: 'DESC',
                id: 'DESC'
            }
        });

        const inactiveAdminOrders: AdminOrderEntity[] = lastAdminOrder.slice(1);

        inactiveAdminOrders.forEach((order: AdminOrderEntity) => order.state = ModelState.INACTIVE);

        if (inactiveAdminOrders.length) {
            await this.adminOrderRepository.save(inactiveAdminOrders);
        }

        if (!lastAdminOrder[0]) {
            const order: AdminOrderEntity = await this.adminOrderRepository.save(this.adminOrderRepository.create({
                email: '',
                isComplete: false
            }));

            return {
                order,
                price: this.getOrderPrice(order.patterns ?? []),
            };
        }

        const order: AdminOrderEntity = await this.getAdminOrder();

        return {
            order,
            price: this.getOrderPrice(order.patterns ?? []),
        };
    }

    public async updateAdminOrder(patterns: InputShortOrderPatternDto[]): Promise<AdminOrderResponseDto> {
        const order: AdminOrderEntity = await this.getAdminOrder();
        const preparedPatternsToCart: InputShortOrderPatternDto[] = patterns
            .filter(pattern => Boolean(pattern.pattern))
            .map((pattern: InputShortOrderPatternDto) => ({
                ...pattern,
                requiresPatternPurchase: true
            }))
            .filter((pattern: InputShortOrderPatternDto) => pattern.sizes?.length > 0);

        const patternOrders: OrderPatternEntity[] = await Promise.all(
            preparedPatternsToCart.map(async (pattern: InputShortOrderPatternDto) =>
                await this.patternOrdersService.createOrderPattern(pattern)));

        order.patterns.forEach((pattern: OrderPatternEntity) => this.patternOrdersService.removeOrderPatter(pattern));

        order.patterns = patternOrders;

        await this.adminOrderRepository.save(order);

        return {
            order,
            price: this.getOrderPrice(patternOrders),
        };
    }

    public async getAdminOrder(): Promise<AdminOrderEntity> {
        return this.adminOrderRepository.findOne({
            where: {
                isComplete: false,
                state: ModelState.ACTIVE
            },
            relations: {
                patterns: {
                    sizes: true,
                    pattern: {
                        basePrice: true,
                        additionalPrice: true,
                        colorPrice: true
                    }
                }
            }
        });
    }

    public async getOpenUserOrder(user: UserEntity): Promise<UserOrderEntity> {
        return this.userOrderRepository.findOne({
            where: {
                user: {
                    id: user.id
                },
                status: OrderStatus.OPEN
            },
            relations: {
                patterns: {
                    sizes: true,
                    pattern: {
                        basePrice: true,
                        additionalPrice: true,
                        colorPrice: true
                    }
                }
            }
        });
    }

    public async getUserCart(user: UserEntity): Promise<CartDto> {
        let order: UserOrderEntity = await this.getOpenUserOrder(user);

        if (!order) {
            order = await this.createOrder(user);
            order.patterns = [];
        }

        return {
            order,
            price: this.getOrderPrice(order.patterns ?? [])
        };
    }

    public async updateOpenUserOrder(user: UserEntity, patterns: InputShortOrderPatternDto[]): Promise<CartDto> {
        const { order }: CartDto = await this.getUserCart(user);
        const previousBoughtPatterns: UserPatternEntity[] = await this.userPatternService.getBoughtPatternsByUser(user);
        const preparedPatternsToBuy: InputShortOrderPatternDto[] = patterns.map((pattern: InputShortOrderPatternDto) => {
            const boughtPattern: UserPatternEntity = previousBoughtPatterns
                .find((item: UserPatternEntity) => item.pattern.id === pattern.pattern);

            if (!boughtPattern) {
                return {
                    pattern: pattern.pattern,
                    requiresPatternPurchase: true,
                    color: pattern.color,
                    sizes: pattern.sizes
                };
            }

            const boughtSizes: number[] = boughtPattern.sizes.map((size: PatternSizeEntity) => size.size.id);

            return {
                pattern: pattern.pattern,
                requiresPatternPurchase: true,
                color: boughtPattern.color ? false : pattern.color,
                sizes: (pattern.sizes ?? [])
                    .filter((size: number) => !boughtSizes.includes(size))
            };
        }).filter((pattern: InputShortOrderPatternDto) => pattern.sizes.length > 0);

        const patternOrders: OrderPatternEntity[] = await Promise.all(
            preparedPatternsToBuy.map(async (pattern: InputShortOrderPatternDto) =>
                await this.patternOrdersService.createOrderPattern(pattern)));

        order.patterns.forEach((pattern: OrderPatternEntity) => this.patternOrdersService.removeOrderPatter(pattern));

        order.patterns = patternOrders;

        await this.userOrderRepository.save(order);

        return { order, price: this.getOrderPrice(patternOrders) };
    }

    public getOrderPrice(patters: OrderPatternEntity[]): NumberEntityDto {
        return {
            en: patters.map((pattern: OrderPatternEntity) =>
                Number(pattern.requiresPatternPurchase) * pattern.pattern.basePrice.en +
                (pattern.sizes.length - (pattern.requiresPatternPurchase ? 0 : 1)) * pattern.pattern.additionalPrice.en +
                Number(pattern.color) * pattern.pattern.colorPrice.en).reduce((a: number, b: number) => a + b, 0),
            ru: patters.map((pattern: OrderPatternEntity) =>
                Number(pattern.requiresPatternPurchase) * pattern.pattern.basePrice.ru +
                (pattern.sizes.length - (pattern.requiresPatternPurchase ? 0 : 1)) * pattern.pattern.additionalPrice.ru +
                Number(pattern.color) * pattern.pattern.colorPrice.ru).reduce((a: number, b: number) => a + b, 0)
        };
    }
}
