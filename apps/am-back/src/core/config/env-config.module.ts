import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { process } from "@am-back/core/declare/process";
import { APP_CONFIG, appConfigModule } from "@am-back/core/config/app-config.module";


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `env/.${process.env.NODE_ENV ?? 'dev'}.env`
        }),
    ],
    providers: [
        {
            provide: APP_CONFIG,
            useValue: appConfigModule,
        },
    ],
})
export class EnvConfigModule {
}
