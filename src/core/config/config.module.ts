import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { process } from "@am/core/declare/process";


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `env/.${process.env.NODE_ENV ?? 'dev'}.env`
        }),
    ],
})
export class ConfModule {
}
