import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { OrdersController } from "./orders.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        OrdersController,
    ],
})
export class OrdersModule {}
