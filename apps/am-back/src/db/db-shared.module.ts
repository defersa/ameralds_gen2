import { DbInfrastructureModule } from "@am-back/db/db-infrastructure.module";
import { AppSettingsDomainModule } from "@am-back/db/service/app-settings/app-settings.module";
import { Module } from "@nestjs/common";
import { OrderDomainModule } from "./services/order/order.module";


@Module({
	imports: [DbInfrastructureModule, AppSettingsDomainModule, OrderDomainModule],
	exports: [DbInfrastructureModule, AppSettingsDomainModule, OrderDomainModule],
})
export class DbSharedModule {}
