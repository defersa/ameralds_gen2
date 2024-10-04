import { Module } from "@nestjs/common";
import { process } from "@am/core/declare/process";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
    CategoryEntity,
    ImageEntity, LabelLangEntity, NumberLangEntity, SizeEntity, TextLangEntity,
    TokenAccessEntity,
    TokenEntity,
    TokenRefreshEntity,
    UserEntity
} from "@am/db/entities";


@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            autoLoadEntities: true,
            entities: [
                TokenAccessEntity,
                TokenEntity,
                TokenRefreshEntity,
                ImageEntity,
                UserEntity,
                CategoryEntity,
                LabelLangEntity,
                NumberLangEntity,
                TextLangEntity,
                SizeEntity,
            ],
            // logging: true,
        }),
    ],
})
export class DbModule {
}
