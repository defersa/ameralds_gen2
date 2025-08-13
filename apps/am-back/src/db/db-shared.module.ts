import { Module } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { TokenService } from "@am-back/db/service/token.service";
import { UserService } from "@am-back/db/service/user.service";
import { ImagesService } from '@am-back/db/service/images.service';
import { CommonEntitiesService } from "@am-back/db/service/common-entities.service";
import { SizesService } from "@am-back/db/service/patterns/sizes.service";
import { CategoriesService } from "@am-back/db/service/patterns/categories.service";
import { PatternsSizeService } from "@am-back/db/service/patterns/pattern-sizes.service";
import { PatternsService } from "@am-back/db/service/patterns/patterns.service";
import { FilesService } from "@am-back/db/service/files.service";
import { OrderService } from "@am-back/db/service/general/order.service";
import { PatternOrdersService } from "@am-back/db/service/patterns/pattern-orders.service";


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
