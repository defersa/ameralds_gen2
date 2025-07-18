import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { OrderPatternEntity, PatternEntity, PatternSizeEntity, UserPatternEntity } from "@am/db/entities";
import { DataSourceService } from "../../data-source.service";
import { CommonEntitiesService } from "@am/db/service/common-entities.service";
import { InputShortOrderPatternDto } from "../../../modules/orders/orders.dto";
import { PatternsService } from "@am/db/service/patterns/patterns.service";
import { PatternsSizeService } from "@am/db/service/patterns/pattern-sizes.service";


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
            bought: order.bought,
            color: order.color,
        });

        await this.orderPatternRepository.save(orderEntity);

        return orderEntity;
    }

    public async removeOrderPatter(order: OrderPatternEntity): Promise<void> {
        await this.orderPatternRepository.remove(order);
    }
}
