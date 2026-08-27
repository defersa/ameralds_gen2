import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { LocalCartController, OrdersController } from "./orders.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        OrdersController,
        LocalCartController,
    ],
})
export class OrdersModule {}
