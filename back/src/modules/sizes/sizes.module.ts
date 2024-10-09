import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { SizesController } from "./sizes.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        SizesController,
    ],
})
export class SizesModule {}
