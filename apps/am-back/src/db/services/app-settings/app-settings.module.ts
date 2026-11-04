import { Module } from "@nestjs/common";
import { AppSettingsService } from "./app-settings.service";
import { AppSettingsRepository } from "./repositories/app-settings.repository";


@Module({
	providers: [AppSettingsService, AppSettingsRepository],
	exports: [AppSettingsService],
})
export class AppSettingsDomainModule {}
