import { Module } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { TokenService } from "@am/db/service/token.service";
import { UserService } from "@am/db/service/user.service";
import { ImageService } from '@am/db/service/image.service';


@Module({
    providers: [DataSourceService, TokenService, UserService, ImageService],
    exports: [DataSourceService, TokenService, UserService, ImageService],
})
export class DbSharedModule {

}
