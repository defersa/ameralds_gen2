import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { DataSourceService } from '../../data-source.service';
import { PatternOrdersService } from '@am-back/db/service/patterns/pattern-orders.service';
import { InputShortOrderPatternDto } from '../../../modules/orders/dto/orders.dto';
import { OrderPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { ModelState } from '../../abstract/abstract.model';
import { AdminOrderResponseDto } from '../../../modules/admin/admin.dto';
import { getOrderPrice, prepareCartPattern } from '@am-back/db/service/order/order.utils';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';


@Injectable()
export class AdminOrderService {
    private adminOrderRepository: Repository<AdminOrderEntity>;

    constructor(
        private dataSource: DataSourceService,
        private patternOrdersService: PatternOrdersService,
    ) {
        this.adminOrderRepository = this.dataSource.getRepository<AdminOrderEntity>(AdminOrderEntity);
    }

    public async getActualCart(): Promise<AdminOrderResponseDto> {
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
            throw new HttpException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART }, HttpStatus.BAD_REQUEST);
        }

        let patterns: OrderPatternEntity[] = [...order.patterns];
        const previousItem: OrderPatternEntity = patterns
            .find((item: OrderPatternEntity) => item.pattern.id === pattern.pattern);

        if (previousItem) {
            await this.patternOrdersService.removeOrderPatter(previousItem);
            patterns = patterns.filter((item: OrderPatternEntity) => item.pattern.id === pattern.pattern);
        }

        const newOrderPatternEntity: OrderPatternEntity = await this.patternOrdersService.createOrderPattern(prepared);

        patterns.push(newOrderPatternEntity);
        order.patterns = patterns;
        await this.adminOrderRepository.save(order);

        return {
            order,
            price: getOrderPrice(order.patterns),
        };
    }

    public async removeFromCart(
        id: number,
    ): Promise<AdminOrderResponseDto> {
        const order: AdminOrderEntity = await this.getCart();

        let patterns: OrderPatternEntity[] = [...order.patterns];
        const previousItem: OrderPatternEntity = order.patterns
            .find((item: OrderPatternEntity) => item.pattern.id === id);

        if (previousItem) {
            await this.patternOrdersService.removeOrderPatter(previousItem);
            patterns = patterns.filter((item: OrderPatternEntity) => item.pattern.id === id);
        }

        order.patterns = patterns;
        await this.adminOrderRepository.save(order);

        return {
            order,
            price: getOrderPrice(order.patterns),
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

    private async getCart(): Promise<AdminOrderEntity> {
        return this.adminOrderRepository.findOne({
            where: {
                isComplete: false,
                state: ModelState.ACTIVE,
            },
            relations: {
                patterns: {
                    sizes: true,
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
