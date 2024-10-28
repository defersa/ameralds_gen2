import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { FilesController } from "./files.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        FilesController,
    ],
})
export class FilesModule {}
