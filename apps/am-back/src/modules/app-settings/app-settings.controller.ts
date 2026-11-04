import { UserRole } from "@am-back/db/entities/user.entity";
import {
	AppSettingsHistoryDto,
	AppSettingsVersionDto,
	CreateAppSettingsDto,
} from "@am-back/modules/app-settings/app-settings.dto";
import { CreateAppSettingsPipe } from "@am-back/modules/app-settings/app-settings.pipe";
import { ErrorsDto } from "@am-back/modules/errors/errors.dto";
import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Auth } from "../../core/guards/auth.guard";
import { Roles } from "../../core/guards/role.guard";
import { AppSettingsService } from "../../db/services/app-settings/app-settings.service";
import type { RequestModel } from "../../models/request.model";


@Controller("admin/app-settings")
@ApiTags("app-settings")
@Auth()
@Roles(UserRole.ADMIN)
@ApiUnauthorizedResponse({
	type: ErrorsDto,
	description: "Требуется авторизация",
})
@ApiForbiddenResponse({ description: "Доступ разрешён только администратору" })
@ApiBadRequestResponse({
	type: ErrorsDto,
	description: "Некорректные данные или версия не найдена",
})
export class AppSettingsController {
	/** Подключает сервис чтения и версионирования настроек приложения. */
	constructor(private readonly settings: AppSettingsService) {}

	/** Возвращает активную версию настроек приложения. */
	@Get()
	@ApiOkResponse({
		type: AppSettingsVersionDto,
		description: "Активная версия настроек",
	})
	public async current(): Promise<AppSettingsVersionDto> {
		return this.settings.current();
	}

	/** Возвращает страницу истории версий настроек по номеру страницы. */
	@Get("list/:page")
	@ApiOkResponse({
		type: AppSettingsHistoryDto,
		description: "История, по 10 версий на страницу, version DESC",
	})
	public async history(@Param("page", ParseIntPipe) page: number): Promise<AppSettingsHistoryDto> {
		return this.settings.history(page);
	}

	/** Возвращает сохранённую версию настроек по её номеру без изменения данных. */
	@Get(":version")
	@ApiOkResponse({
		type: AppSettingsVersionDto,
		description: "Сохранённая версия, только для чтения",
	})
	public async version(@Param("version", ParseIntPipe) version: number): Promise<AppSettingsVersionDto> {
		return this.settings.version(version);
	}

	/**
	 * Создаёт версию настроек от имени текущего пользователя с проверкой ожидаемой версии и валидацией тела
	 * запроса.
	 */
	@Post()
	@ApiCreatedResponse({
		type: AppSettingsVersionDto,
		description: "Создана новая активная версия",
	})
	@ApiConflictResponse({
		type: ErrorsDto,
		description: "VERSION_CONFLICT: настройки изменены другим администратором",
	})
	public async create(
		@Body(CreateAppSettingsPipe) body: CreateAppSettingsDto,
		@Req() request: RequestModel,
	): Promise<AppSettingsVersionDto> {
		return this.settings.createVersion(body.expectedVersion, body.changes, request.user.id);
	}
}
