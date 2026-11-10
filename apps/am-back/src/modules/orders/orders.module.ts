import { CheckoutController } from "./checkout.controller";
import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { LocalCartController, OrdersController, UserOrdersController } from "./orders.controller";
import { PaymentsController } from './payments.controller';


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        CheckoutController,
        OrdersController,
        LocalCartController,
        UserOrdersController,
        PaymentsController,
    ],
})
export class OrdersModule {}
