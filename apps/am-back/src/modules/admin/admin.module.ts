import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { AdminController } from "./admin.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        AdminController,
    ],
})
export class AdminModule {}
