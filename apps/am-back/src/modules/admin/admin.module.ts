import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { AdminCartController } from "./admin-cart.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        AdminCartController,
    ],
})
export class AdminModule {}
