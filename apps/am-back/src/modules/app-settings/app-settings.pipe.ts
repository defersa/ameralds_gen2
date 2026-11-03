import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { applyAppSettingsChanges, InvalidAppSettingsChangesError, isSettingsObject } from '../../db/services/app-settings/app-settings.schema';
import { ApiEntityNames, ApiErrorCodes } from '../errors/errors.dto';
import type { CreateAppSettingsDto } from './app-settings.dto';

@Injectable()
export class CreateAppSettingsPipe implements PipeTransform<unknown, CreateAppSettingsDto> {
    public transform(value: unknown): CreateAppSettingsDto {
        const invalid = () => new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.APP_SETTINGS });
        if (!isSettingsObject(value) || Object.keys(value).length !== 2
            || !Number.isSafeInteger(value.expectedVersion) || Number(value.expectedVersion) < 1
            || Number(value.expectedVersion) > 2147483647 || !Object.prototype.hasOwnProperty.call(value, 'changes')) {
            throw invalid();
        }
        try {
            // Используем тот же whitelist/ограничения, что и сервис хранения.
            applyAppSettingsChanges({}, value.changes);
        } catch (error) {
            if (!(error instanceof InvalidAppSettingsChangesError)) throw error;
            throw invalid();
        }
        return value as unknown as CreateAppSettingsDto;
    }
}
