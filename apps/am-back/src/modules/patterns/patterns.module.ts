import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { PatternsController } from "./patterns.controller";
import { PurchasedPatternFilesController } from './purchased-pattern-files.controller';


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        PatternsController,
        PurchasedPatternFilesController,
    ],
})
export class PatternsModule {}
