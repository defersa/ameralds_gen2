import { Module } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { TokenService } from "@am/db/service/token/token.service";
import { UserService } from "@am/db/service/user/user.service";


@Module({
    providers: [DataSourceService, TokenService, UserService],
    exports: [DataSourceService, TokenService, UserService],
})
export class DbSharedModule {

}
