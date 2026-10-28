import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { LocalCartController, OrdersController, UserOrdersController } from "./orders.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        OrdersController,
        LocalCartController,
        UserOrdersController,
    ],
})
export class OrdersModule {}
