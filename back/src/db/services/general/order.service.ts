import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { AdminOrderEntity, OrderPatternEntity, OrderStatus, UserEntity, UserOrderEntity } from "@am/db/entities";
import { DataSourceService } from "../../data-source.service";
import { InputShortOrderPatternDto } from "../../../modules/orders/orders.dto";
import { PatternOrdersService } from "@am/db/service/patterns/pattern-orders.service";


@Injectable()
export class OrderService {
    private adminOrderRepository: Repository<AdminOrderEntity>;
    private userOrderRepository: Repository<UserOrderEntity>;

    constructor(
        private dataSource: DataSourceService,
        private patternOrdersService: PatternOrdersService
    ) {
        this.adminOrderRepository = this.dataSource.getRepository<AdminOrderEntity>(AdminOrderEntity);
        this.userOrderRepository = this.dataSource.getRepository<UserOrderEntity>(UserOrderEntity);
    }

    public async createOrder(user: UserEntity): Promise<UserOrderEntity> {
        const order: UserOrderEntity = this.userOrderRepository.create({ user });

        return this.userOrderRepository.save(order);
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
                        colorPrice: true,
                    },
                },
            },
        });
    }

    public async updateOpenUserOrder(user: UserEntity, patterns: InputShortOrderPatternDto[]): Promise<UserOrderEntity> {
        const order: UserOrderEntity = await this.getOpenUserOrder(user);

        const patternOrders: OrderPatternEntity[] = await Promise.all(
            patterns.map(async (pattern: InputShortOrderPatternDto) =>
                await this.patternOrdersService.createOrderPattern(pattern)));

        order.patterns.forEach((pattern: OrderPatternEntity) => this.patternOrdersService.removeOrderPatter(pattern));

        order.patterns = patternOrders;

        await this.userOrderRepository.save(order);

        return order;
    }

}
