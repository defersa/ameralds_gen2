import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { AdminOrderEntity, UserOrderEntity } from "@am/db/entities";
import { DataSourceService } from "../../data-source.service";


@Injectable()
export class OrderService {
    private adminOrderRepository: Repository<AdminOrderEntity>;
    private userOrderRepository: Repository<UserOrderEntity>;

    constructor(
        private dataSource: DataSourceService,
    ) {
        this.adminOrderRepository = this.dataSource.getRepository<AdminOrderEntity>(AdminOrderEntity);
        this.userOrderRepository = this.dataSource.getRepository<UserOrderEntity>(UserOrderEntity);
    }

}
