import { ApiEntityNames, ApiErrorCodes, INT32_MAX, MIN_POSITIVE_INTEGER } from "@ameralds/utils";
import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import {
	applyAppSettingsChanges,
	InvalidAppSettingsChangesError,
	isSettingsObject,
} from "../../db/services/app-settings/app-settings.schema";
import type { CreateAppSettingsDto } from "./app-settings.dto";


@Injectable()
export class CreateAppSettingsPipe implements PipeTransform<unknown, CreateAppSettingsDto> {
	/**
	 * Проверяет номер ожидаемой версии и непустые разрешённые изменения настроек; неверное тело запроса
	 * отклоняет ошибкой INVALID.
	 */
	public transform(value: unknown): CreateAppSettingsDto {
		/** Создаёт стандартную ошибку INVALID для некорректного запроса изменения настроек. */
		const invalid = () =>
			new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.APP_SETTINGS,
			});

		if (
			!isSettingsObject(value) ||
			Object
				.keys(value).length !== 2 ||
			!Number.isSafeInteger(value.expectedVersion) ||
			Number(value.expectedVersion) < MIN_POSITIVE_INTEGER ||
			Number(value.expectedVersion) > INT32_MAX ||
			!Object.prototype.hasOwnProperty.call(value, "changes")
		) {
			throw invalid();
		}

		try {
			// Используем тот же whitelist/ограничения, что и сервис хранения.
			applyAppSettingsChanges({}, value.changes);
		} catch (error) {
			if (!(error instanceof InvalidAppSettingsChangesError)) {
				throw error;
			}

			throw invalid();
		}
		return value as unknown as CreateAppSettingsDto;
	}
}
