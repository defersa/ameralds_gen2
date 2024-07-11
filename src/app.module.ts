import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfModule } from "@am/core/config/config.module";
import { DbModule } from "@am/db/db.module";


@Module({
    imports: [
        ConfModule,
        DbModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
