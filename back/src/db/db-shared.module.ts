import { Module } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { TokenService } from "@am/db/service/token.service";
import { UserService } from "@am/db/service/user.service";
import { ImagesService } from '@am/db/service/images.service';
import { CommonEntitiesService } from "@am/db/service/common-entities.service";
import { SizesService } from "@am/db/service/patterns/sizes.service";
import { CategoriesService } from "@am/db/service/patterns/categories.service";
import { PatternsSizeService } from "@am/db/service/patterns/pattern-sizes.service";
import { PatternsService } from "@am/db/service/patterns/patterns.service";
import { FilesService } from "@am/db/service/files.service";
import { OrderService } from "@am/db/service/general/order.service";
import { PatternOrdersService } from "@am/db/service/patterns/pattern-orders.service";


const services: any[] = [
    DataSourceService,
    TokenService,
    UserService,
    ImagesService,
    CommonEntitiesService,
    CategoriesService,
    SizesService,
    PatternsSizeService,
    PatternsService,
    FilesService,
    PatternOrdersService,
    OrderService,
];

@Module({
    providers: services,
    exports: services,
})
export class DbSharedModule {

}
