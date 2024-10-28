import { Module } from "@nestjs/common";
import { DbSharedModule } from "../../db/db-shared.module";
import { ImagesController } from "./images.controller";


@Module({
    imports: [
        DbSharedModule,
    ],
    controllers: [
        ImagesController,
    ],
})
export class ImagesModule {}
