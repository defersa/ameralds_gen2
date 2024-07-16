import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfModule } from "@am/core/config/config.module";
import { DbModule } from "@am/db/db.module";
import { AmJwtModule } from "@am/core/jwt/jwt.module";


@Module({
    imports: [
        ConfModule,
        AmJwtModule,
        // DbModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
