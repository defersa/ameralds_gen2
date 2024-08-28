import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EnvConfigModule } from "@am/core/config/env-config.module";
import { AmJwtModule } from "@am/core/jwt/jwt.module";
import { DbModule } from "./db/db.module";
import { APP_GUARD, RouterModule } from "@nestjs/core";
import { UserModule } from "./modules/user/user.module";
import { UserMiddleware } from "@am/core/middleware/user.middleware";
import { DbSharedModule } from "./db/db-shared.module";
import { RolesGuard } from "@am/core/guards/role.guard";
import { AuthGuard } from "@am/core/guards/auth.guard";
import { AppConfigModule } from "@am/core/config/app-config.module";


@Module({
    imports: [
        AppConfigModule,
        EnvConfigModule,
        AmJwtModule,
        DbModule,
        RouterModule.register([
            {
                path: 'user',
                module: UserModule,
            },
        ]),
        UserModule,
        DbSharedModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
    exports: [DbModule],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(UserMiddleware)
            .forRoutes('*');
    }
}
