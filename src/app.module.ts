import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfModule } from "@am/core/config/config.module";
import { AmJwtModule } from "@am/core/jwt/jwt.module";
import { DbModule } from "./db/db.module";
import { RouterModule } from "@nestjs/core";
import { UserModule } from "./modules/user/user.module";


@Module({
    imports: [
        ConfModule,
        AmJwtModule,
        DbModule,
        RouterModule.register([
            {
                path: 'user',
                module: UserModule,
            },
        ]),
        UserModule,
    ],
    controllers: [AppController],
    providers: [AppService],
    exports: [DbModule],
})
export class AppModule {
}
