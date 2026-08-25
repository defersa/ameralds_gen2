import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { DataSourceService } from "../../data-source.service";
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { InputShortOrderPatternDto } from "../../../modules/orders/dto/orders.dto";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { PatternsSizeService } from "@am-back/db/service/patterns/pattern-sizes.service";
import { OrderPatternEntity, UserPatternEntity } from '../../entities/patterns/pattern-order.entity';
import { PatternEntity } from '../../entities/patterns/pattern.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';


@Injectable()
export class PatternOrdersService {
    private userPatternRepository: Repository<UserPatternEntity>;
    private orderPatternRepository: Repository<OrderPatternEntity>;

    constructor(
        private dataSource: DataSourceService,
        private commonEntitiesService: CommonEntitiesService,
        private patternsService: PatternsService,
        private patternSizeService: PatternsSizeService,
    ) {
        this.userPatternRepository = this.dataSource.getRepository<UserPatternEntity>(UserPatternEntity);
        this.orderPatternRepository = this.dataSource.getRepository<OrderPatternEntity>(OrderPatternEntity);
    }

    public async createOrderPattern(order: InputShortOrderPatternDto): Promise<OrderPatternEntity> {
        const pattern: PatternEntity = await this.patternsService.getPattern(order.pattern);
        const sizes: PatternSizeEntity[] = await this.patternSizeService.getPatternSizes(order.sizes);

        const orderEntity: OrderPatternEntity = this.orderPatternRepository.create({
            pattern,
            sizes,
            requiresPatternPurchase: order.requiresPatternPurchase,
            color: order.color,
        });

        await this.orderPatternRepository.save(orderEntity);

        return orderEntity;
    }

    public async removeOrderPatter(order: OrderPatternEntity): Promise<void> {
        await this.orderPatternRepository.remove(order);
    }
}
