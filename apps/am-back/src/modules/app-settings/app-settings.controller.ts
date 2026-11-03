import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Auth } from '../../core/guards/auth.guard';
import { Roles } from '../../core/guards/role.guard';
import { UserRole } from '../../db/entities/user.entity';
import { AppSettingsService } from '../../db/services/app-settings/app-settings.service';
import { effectiveSetting, APP_SETTINGS_REGISTRY } from '../../db/services/app-settings/app-settings.schema';
import type { AppSettingEntity } from '../../db/entities/app-setting.entity';
import type { RequestModel } from '../../models/request.model';
import { ErrorsDto } from '../errors/errors.dto';
import { AppSettingsHistoryDto, AppSettingsVersionDto, CreateAppSettingsDto } from './app-settings.dto';
import { CreateAppSettingsPipe } from './app-settings.pipe';

@Controller('admin/app-settings')
@ApiTags('app-settings')
@Auth()
@Roles(UserRole.ADMIN)
@ApiUnauthorizedResponse({ type: ErrorsDto, description: 'Требуется авторизация' })
@ApiForbiddenResponse({ description: 'Доступ разрешён только администратору' })
@ApiBadRequestResponse({ type: ErrorsDto, description: 'Некорректные данные или версия не найдена' })
export class AppSettingsController {
    constructor(private readonly settings: AppSettingsService) {}

    @Get()
    @ApiOkResponse({ type: AppSettingsVersionDto, description: 'Активная версия настроек' })
    public async current(): Promise<AppSettingsVersionDto> {
        const current = await this.settings.current();
        return this.toDto(await this.settings.version(current.version));
    }

    @Get('list/:page')
    @ApiOkResponse({ type: AppSettingsHistoryDto, description: 'История, по 10 версий на страницу, version DESC' })
    public async history(@Param('page', ParseIntPipe) page: number): Promise<AppSettingsHistoryDto> {
        const history = await this.settings.history(page);
        return { ...history, items: history.items.map(version => this.toDto(version)) };
    }

    @Get(':version')
    @ApiOkResponse({ type: AppSettingsVersionDto, description: 'Сохранённая версия, только для чтения' })
    public async version(@Param('version', ParseIntPipe) version: number): Promise<AppSettingsVersionDto> {
        return this.toDto(await this.settings.version(version));
    }

    @Post()
    @ApiCreatedResponse({ type: AppSettingsVersionDto, description: 'Создана новая активная версия' })
    @ApiConflictResponse({ type: ErrorsDto, description: 'VERSION_CONFLICT: настройки изменены другим администратором' })
    public async create(@Body(CreateAppSettingsPipe) body: CreateAppSettingsDto, @Req() request: RequestModel): Promise<AppSettingsVersionDto> {
        const version = await this.settings.createVersion(body.expectedVersion, body.changes, request.user.id);
        return this.toDto(await this.settings.version(version.version));
    }

    private toDto(version: AppSettingEntity): AppSettingsVersionDto {
        return {
            version: version.version, createdAt: version.createdAt, snapshot: version.snapshot,
            createdBy: version.createdBy ? {
                id: version.createdBy.id, username: version.createdBy.username, email: version.createdBy.email,
            } : null,
            effective: { orders: { paymentExpirationDays: effectiveSetting(
                version.snapshot.orders?.paymentExpirationDays, APP_SETTINGS_REGISTRY['orders.paymentExpirationDays'],
            ) } },
        };
    }
}
