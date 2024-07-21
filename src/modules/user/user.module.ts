import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { DbSharedModule } from "../../db/db-shared.module";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        UserController,
    ],
})
export class UserModule {}
