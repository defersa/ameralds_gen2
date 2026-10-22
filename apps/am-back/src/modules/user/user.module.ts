import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { DbSharedModule } from "../../db/db-shared.module";
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthThrottleGuard, SessionRequestGuard } from './session-http';


@Module({
    imports: [
        DbSharedModule,
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ],
    controllers: [
        UserController,
    ],
    providers: [AuthThrottleGuard, SessionRequestGuard],
})
export class UserModule {}
