import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { process } from "@am-back/core/declare/process";


@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: "60s" },
        }),
    ],
})
export class AmJwtModule {}
