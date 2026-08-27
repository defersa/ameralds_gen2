import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceService } from '../../data-source.service';
import { CartDto, InputShortOrderPatternDto } from '../../../modules/orders/dto/orders.dto';
import { PatternOrdersService } from '@am-back/db/service/patterns/pattern-orders.service';
import { OrderStatus, UserOrderEntity } from '../../entities/purchases/order.entity';
import { UserEntity } from '../../entities/user.entity';
import { OrderPatternEntity, UserPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { UserPatternService } from '@am-back/db/service/general/user-pattern.service';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { NumberEntityDto } from '../../../common/common.dto';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PatternsService } from '@am-back/db/service/patterns/patterns.service';
import { type PatternOrderForPriceModel } from '@ameralds/utils';
import { getOrderPrice, prepareCartPattern } from '@am-back/db/service/order/order.utils';


@Injectable()
export class OrderService {
    private userOrderRepository: Repository<UserOrderEntity>;

    constructor(
        private dataSource: DataSourceService,
        private patternOrdersService: PatternOrdersService,
        private userPatternService: UserPatternService,
        private patternsService: PatternsService
    ) {
        this.userOrderRepository = this.dataSource.getRepository<UserOrderEntity>(UserOrderEntity);
    }

    public async createOrder(user: UserEntity): Promise<UserOrderEntity> {
        const order: UserOrderEntity = this.userOrderRepository.create({ user });

        return this.userOrderRepository.save(order);
    }

    public async getOpenUserOrder(user: UserEntity): Promise<UserOrderEntity> {
        let order: UserOrderEntity = await this.userOrderRepository.findOne({
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

        if (!order) {
            order = await this.createOrder(user);
            order.patterns = [];
        }

        return order;
    }

    public async getUserCart(user: UserEntity): Promise<CartDto> {
        const cart: UserOrderEntity = await this.getOpenUserOrder(user);

        return {
            cart,
            price: getOrderPrice(cart.patterns ?? [])
        };
    }

    public async addToUserCart(
        user: UserEntity,
        pattern: InputShortOrderPatternDto
    ): Promise<CartDto> {
        const cart: UserOrderEntity = await this.getOpenUserOrder(user);
        const previousBoughtPatterns: UserPatternEntity[] = await this.userPatternService.getBoughtPatternsByUser(user);
        const prepared: InputShortOrderPatternDto = this.prepareInputPattern(pattern, previousBoughtPatterns);

        let patterns: OrderPatternEntity[] = [...cart.patterns];
        const previousItem: OrderPatternEntity = patterns
            .find((item: OrderPatternEntity) => item.pattern.id === pattern.pattern);

        if (previousItem) {
            await this.patternOrdersService.removeOrderPatter(previousItem);
            patterns = patterns.filter((item: OrderPatternEntity) => item.pattern.id === pattern.pattern);
        }

        const newOrderPatternEntity: OrderPatternEntity = await this.patternOrdersService.createOrderPattern(prepared);
        patterns.push(newOrderPatternEntity);
        cart.patterns = patterns;

        await this.userOrderRepository.save(cart);

        return this.getCartResponse(cart);
    }

    public async removeFromUserCart(
        user: UserEntity,
        id: number
    ): Promise<CartDto> {
        const cart: UserOrderEntity = await this.getOpenUserOrder(user);

        let patterns: OrderPatternEntity[] = [...cart.patterns];
        const previousItem: OrderPatternEntity = cart.patterns
            .find((item: OrderPatternEntity) => item.pattern.id === id);

        if (previousItem) {
            await this.patternOrdersService.removeOrderPatter(previousItem);
            patterns = patterns.filter((item: OrderPatternEntity) => item.pattern.id === id);
        }

        cart.patterns = patterns;
        await this.userOrderRepository.save(cart);

        return this.getCartResponse(cart);
    }

    public async mergeLocalCartWithUserCart(user: UserEntity, patterns: InputShortOrderPatternDto[]): Promise<CartDto> {
        const cart: UserOrderEntity = await this.getOpenUserOrder(user);
        const previousBoughtPatterns: UserPatternEntity[] = await this.userPatternService.getBoughtPatternsByUser(user);
        const preparedPatternsToBuy: InputShortOrderPatternDto[] = patterns
            .map((pattern: InputShortOrderPatternDto) => this.prepareInputPattern(pattern, previousBoughtPatterns))
            .filter((pattern: InputShortOrderPatternDto) => pattern.sizes.length > 0);

        const patternOrders: OrderPatternEntity[] = await Promise.all(
            preparedPatternsToBuy.map(
                async (pattern: InputShortOrderPatternDto) =>
                    await this.patternOrdersService.createOrderPattern(pattern)
            )
        );

        cart.patterns
            .filter((pattern: OrderPatternEntity) => preparedPatternsToBuy
                .some((item: InputShortOrderPatternDto) => item.pattern === pattern.pattern.id))
            .forEach((pattern: OrderPatternEntity) =>
                this.patternOrdersService.removeOrderPatter(pattern));

        const currentCartPatterns: OrderPatternEntity[] = cart.patterns
            .filter((pattern: OrderPatternEntity) => !preparedPatternsToBuy
                .some((item: InputShortOrderPatternDto) => item.pattern === pattern.pattern.id));

        cart.patterns = [...currentCartPatterns, ...patternOrders];
        await this.userOrderRepository.save(cart);

        return this.getCartResponse(cart);
    }

    public async clearUserCart(user: UserEntity): Promise<CartDto> {
        const cart: UserOrderEntity = await this.getOpenUserOrder(user);

        cart.patterns
            .forEach((pattern: OrderPatternEntity) =>
                this.patternOrdersService.removeOrderPatter(pattern));

        cart.patterns = [];
        await this.userOrderRepository.save(cart);

        return this.getCartResponse(cart);
    }

    public async getLocalPrice(
        patterns: InputShortOrderPatternDto[]
    ): Promise<NumberEntityDto> {
        const preparedPatternsToCart: InputShortOrderPatternDto[] = patterns
            .map(prepareCartPattern)
            .filter(Boolean);

        const patternList: Record<number, PatternEntity> = await this.patternsService.patternsById(
            preparedPatternsToCart.map((pattern: InputShortOrderPatternDto) => pattern.pattern)
        ) as unknown as Record<number, PatternEntity>;

        const patternOrders: PatternOrderForPriceModel[] = preparedPatternsToCart
            .map((item: InputShortOrderPatternDto) => ({ ...item, pattern: patternList[item.pattern] }));

        return getOrderPrice(patternOrders);
    }

    private getCartResponse(cart: UserOrderEntity): CartDto {
        return { cart, price: getOrderPrice(cart.patterns) };
    }

    private prepareInputPattern(pattern: InputShortOrderPatternDto, bought: UserPatternEntity[]): InputShortOrderPatternDto {
        const boughtPattern: UserPatternEntity = bought
            .find((item: UserPatternEntity) => item.pattern.id === pattern.pattern);

        if (!boughtPattern) {
            return prepareCartPattern(pattern);
        }

        const boughtSizes: number[] = boughtPattern.sizes.map((size: PatternSizeEntity) => size.size.id);

        return {
            pattern: pattern.pattern,
            requiresPatternPurchase: true,
            color: boughtPattern.color ? false : pattern.color,
            sizes: (pattern.sizes ?? [])
                .filter((size: number) => !boughtSizes.includes(size))
        };
    }
}
