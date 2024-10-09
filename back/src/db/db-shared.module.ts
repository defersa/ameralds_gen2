import { Module } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { TokenService } from "@am/db/service/token.service";
import { UserService } from "@am/db/service/user.service";
import { ImageService } from '@am/db/service/image.service';
import { CommonEntitiesService } from "@am/db/service/common-entities.service";
import { CategoriesService } from "@am/db/service/categories.service";
import { SizesService } from "@am/db/service/sizes.service";


const services: any[] = [
    DataSourceService,
    TokenService,
    UserService,
    ImageService,
    CommonEntitiesService,
    CategoriesService,
    SizesService,
];

@Module({
    providers: services,
    exports: services,
})
export class DbSharedModule {

}
