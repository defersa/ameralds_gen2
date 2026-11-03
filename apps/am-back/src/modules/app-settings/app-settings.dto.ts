import { ApiProperty } from '@nestjs/swagger';
import { PaginatedPageDto } from '../../common/common.dto';
import { APP_SETTINGS_REGISTRY, type StoredAppSettings } from '../../db/services/app-settings/app-settings.schema';

const expiration = APP_SETTINGS_REGISTRY['orders.paymentExpirationDays'];

export class OrderSettingsDto {
    @ApiProperty({ description: 'Срок оплаты заказа, дней', type: 'integer', minimum: expiration.min, maximum: expiration.max, default: expiration.defaultValue })
    public paymentExpirationDays: number;
}

export class AppSettingsValuesDto {
    @ApiProperty({ type: OrderSettingsDto })
    public orders: OrderSettingsDto;
}

export class CreateAppSettingsDto {
    @ApiProperty({ description: 'Версия, на основе которой администратор начал редактирование', type: 'integer', minimum: 1, maximum: 2147483647 })
    public expectedVersion: number;

    @ApiProperty({ type: AppSettingsValuesDto, description: 'Только разрешённые изменения; неизвестные поля не принимаются' })
    public changes: AppSettingsValuesDto;
}

export class AppSettingsAuthorDto {
    @ApiProperty({ type: Number })
    public id: number;

    @ApiProperty({ type: String, nullable: true })
    public username: string | null;

    @ApiProperty({ type: String })
    public email: string;
}

export class AppSettingsVersionDto {
    @ApiProperty({ type: Number })
    public version: number;

    @ApiProperty({ type: Date })
    public createdAt: Date;

    @ApiProperty({ type: AppSettingsAuthorDto, nullable: true })
    public createdBy: AppSettingsAuthorDto | null;

    @ApiProperty({ type: 'object', additionalProperties: true, description: 'Исходный immutable snapshot, включая неизвестные и deprecated поля' })
    public snapshot: StoredAppSettings;

    @ApiProperty({ type: AppSettingsValuesDto, description: 'Эффективные значения с defaults для отсутствующих полей' })
    public effective: AppSettingsValuesDto;
}

export class AppSettingsHistoryDto extends PaginatedPageDto {
    @ApiProperty({ type: AppSettingsVersionDto, isArray: true })
    public items: AppSettingsVersionDto[];

    @ApiProperty({ type: Number, description: 'Общее количество версий' })
    public total: number;

    @ApiProperty({ type: Number, nullable: true, description: 'Максимальная версия в момент чтения истории' })
    public activeVersion: number | null;
}
