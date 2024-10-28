import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { PatternsController } from "./patterns.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        PatternsController,
    ],
})
export class PatternsModule {}
