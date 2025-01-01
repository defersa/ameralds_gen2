import { Module } from "@nestjs/common";
import { process } from "@am/core/declare/process";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
    CategoryEntity,
    FileEntity,
    ImageEntity,
    LabelLangEntity,
    NumberLangEntity,
    PatternSizeEntity,
    PatternEntity,
    PrivateFileEntity,
    PublicFileEntity,
    SizeEntity,
    TextLangEntity,
    TokenAccessEntity,
    TokenEntity,
    TokenRefreshEntity,
    UserEntity, OrderPatternEntity, UserPatternEntity, AdminOrderEntity, UserOrderEntity, UserPaymentEntity
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
                FileEntity,
                PublicFileEntity,
                PrivateFileEntity,
                PatternEntity,
                PatternSizeEntity,

                OrderPatternEntity,
                UserPatternEntity,

                AdminOrderEntity,
                UserOrderEntity,
                UserPaymentEntity,
            ],
            // logging: true,
        }),
    ],
})
export class DbModule {
}
