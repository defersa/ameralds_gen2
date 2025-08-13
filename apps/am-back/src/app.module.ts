import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EnvConfigModule } from "@am-back/core/config/env-config.module";
import { AmJwtModule } from "@am-back/core/jwt/jwt.module";
import { DbModule } from "./db/db.module";
import { APP_GUARD, RouterModule } from "@nestjs/core";
import { UserModule } from "./modules/user/user.module";
import { UserMiddleware } from "@am-back/core/middleware/user.middleware";
import { DbSharedModule } from "./db/db-shared.module";
import { RolesGuard } from "@am-back/core/guards/role.guard";
import { AuthGuard } from "@am-back/core/guards/auth.guard";
import { AppConfigModule } from "@am-back/core/config/app-config.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { SizesModule } from "./modules/sizes/sizes.module";
import { PatternsModule } from "./modules/patterns/patterns.module";
import { ImagesModule } from "./modules/images/images.module";
import { ScheduleModule } from "@nestjs/schedule";
import { FilesModule } from "./modules/files/files.module";
import { OrdersModule } from "./modules/orders/orders.module";


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
        ScheduleModule.forRoot(),
        UserModule,
        CategoriesModule,
        SizesModule,
        PatternsModule,
        ImagesModule,
        FilesModule,
        OrdersModule,
        DbSharedModule,
    ],
    controllers: [AppController],
    providers: [
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
