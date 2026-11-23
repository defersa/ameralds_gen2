import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { AdminCartController } from "./admin-cart.controller";
import { AdminPlacedOrdersController } from './admin-placed-orders.controller';


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        AdminCartController,
        AdminPlacedOrdersController,
    ],
})
export class AdminModule {}
