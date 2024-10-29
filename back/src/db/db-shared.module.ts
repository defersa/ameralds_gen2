import { Module } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { TokenService } from "@am/db/service/token.service";
import { UserService } from "@am/db/service/user.service";
import { ImagesService } from '@am/db/service/images.service';
import { CommonEntitiesService } from "@am/db/service/common-entities.service";
import { CategoriesService } from "@am/db/service/categories.service";
import { SizesService } from "@am/db/service/sizes.service";
import { PatternsService } from "@am/db/service/patterns.service";
import { FilesService } from "@am/db/service/files.service";
import { PatternsSizeService } from "@am/db/service/pattern-sizes.service";


const services: any[] = [
    DataSourceService,
    TokenService,
    UserService,
    ImagesService,
    CommonEntitiesService,
    CategoriesService,
    SizesService,
    PatternsService,
    FilesService,
    PatternsSizeService,
];

@Module({
    providers: services,
    exports: services,
})
export class DbSharedModule {

}
