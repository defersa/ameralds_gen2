import { Module } from '@nestjs/common';
import { DbSharedModule } from '../../db/db-shared.module';
import { AppSettingsController } from './app-settings.controller';

@Module({ imports: [DbSharedModule], controllers: [AppSettingsController] })
export class AppSettingsModule {}
