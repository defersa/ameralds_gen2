import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { CategoriesController } from "./categories.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        CategoriesController,
    ],
})
export class CategoriesModule {}
