import { Module } from "@nestjs/common";
import { process } from "@am/core/declare/process";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@am/db/models/user";
import { Token } from "@am/db/models/token";


@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            entities: [
                Token,
                User,
            ],
        }),
    ],
})
export class DbModule {
}
