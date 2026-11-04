import { ApiEntityNames, ApiErrorCodes, DEFAULT_PAGE_SIZE, INT32_MAX, MIN_POSITIVE_INTEGER } from "@ameralds/utils";
import type { AppSettingsHistoryDto, AppSettingsVersionDto } from "@am-back/modules/app-settings/app-settings.dto";
import { BadRequestException, ConflictException, Injectable, type OnModuleInit } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { toAppSettingsVersion } from "./app-settings.mapper";
import {
	APP_SETTINGS_REGISTRY,
	DEFAULT_APP_SETTINGS,
	InvalidAppSettingsChangesError,
	applyAppSettingsChanges,
	effectiveSetting,
	readStoredSetting,
	type AppSettingKey,
	type AppSettingValue,
	type AppSettingsChanges,
	type StoredAppSettings,
} from "./app-settings.schema";
import { AppSettingsRepository } from "./repositories/app-settings.repository";


@Injectable()
export class AppSettingsService implements OnModuleInit {
	/** Подключает репозиторий версий настроек и источник транзакций. */
	constructor(
		private readonly versions: AppSettingsRepository,
		private readonly dataSource: DataSource,
	) {}

	/** При запуске модуля проверяет текущие настройки и создаёт начальную версию при её отсутствии. */
	public async onModuleInit(): Promise<void> {
		await this.current();
	}

	/**
	 * Возвращает последнюю версию настроек; при пустом хранилище инициализирует её под блокировкой в
	 * текущей или новой транзакции.
	 */
	public async current(manager?: EntityManager): Promise<AppSettingsVersionDto> {
		const current = await this.versions.findCurrent(manager);

		if (current) {
			return toAppSettingsVersion(current);
		}

		if (manager?.queryRunner?.isTransactionActive) {
			return this.initialize(manager);
		}

		return this.dataSource.transaction("READ COMMITTED", (transaction) => this.initialize(transaction));
	}

	/**
	 * Возвращает указанную положительную int32-версию настроек; для отсутствующей версии возвращает
	 * NOT_EXIST.
	 */
	public async version(version: number): Promise<AppSettingsVersionDto> {
		this.validatePositiveInt32(version);

		const result = await this.versions.findVersion(version);

		if (!result) {
			throw new BadRequestException({
				code: ApiErrorCodes.NOT_EXIST,
				entity: ApiEntityNames.APP_SETTINGS,
			});
		}

		return toAppSettingsVersion(result);
	}

	/**
	 * Читает страницу истории и номер активной версии в одной транзакции REPEATABLE READ, чтобы ответ
	 * отражал единый снимок данных.
	 */
	public async history(page: number): Promise<AppSettingsHistoryDto> {
		this.validatePositiveInt32(page);

		const take = DEFAULT_PAGE_SIZE;

		return this.dataSource.transaction("REPEATABLE READ", async (manager) => {
			const [items, total] = await this.versions.findHistoryPage(page, take, manager);
			const active = await this.versions.findCurrent(manager);

			if (active) {
				toAppSettingsVersion(active);
			}

			return {
				items: items
					.map(toAppSettingsVersion),
				page,
				count: Math.ceil(total / take),
				total,
				activeVersion: active?.version ?? null,
			};
		});
	}

	/**
	 * Возвращает сохранённое значение текущей настройки без defaults; для отсутствующего ключа возвращает
	 * undefined.
	 */
	public async getRaw<K extends AppSettingKey>(key: K): Promise<AppSettingValue<K> | undefined> {
		return readStoredSetting((await this.current()).snapshot, key);
	}

	/** Возвращает действующее значение текущей настройки с проверкой типа и подстановкой defaults. */
	public async get<K extends AppSettingKey>(key: K): Promise<AppSettingValue<K>> {
		return effectiveSetting(readStoredSetting((await this.current()).snapshot, key), APP_SETTINGS_REGISTRY[key]);
	}

	/**
	 * Создаёт новую версию настроек в транзакции под общей блокировкой. При несовпадении expectedVersion
	 * возвращает VERSION_CONFLICT; сохраняет автора изменений.
	 */
	public async createVersion(
		expectedVersion: number,
		changes: AppSettingsChanges,
		createdById: number,
	): Promise<AppSettingsVersionDto> {
		this.validatePositiveInt32(expectedVersion);
		this.validatePositiveInt32(createdById);
		return this.dataSource.transaction("READ COMMITTED", async (manager) => {
			await this.versions.lockVersions(manager);

			const previous = await this.current(manager);

			if (previous.version !== expectedVersion) {
				throw new ConflictException({
					code: ApiErrorCodes.VERSION_CONFLICT,
					entity: ApiEntityNames.APP_SETTINGS,
				});
			}

			return toAppSettingsVersion(
				await this.versions.insertVersion(
					previous.version + 1,
					this.applyChanges(previous.snapshot, changes),
					createdById,
					manager,
				),
			);
		});
	}

	/**
	 * Под общей блокировкой повторно проверяет хранилище и при необходимости создаёт версию 1 с defaults.
	 * Требует транзакционный manager.
	 */
	private async initialize(manager: EntityManager): Promise<AppSettingsVersionDto> {
		await this.versions.lockVersions(manager);

		const current =
			(await this.versions.findCurrent(manager)) ??
			(await this.versions.insertVersion(1, structuredClone(DEFAULT_APP_SETTINGS), null, manager));

		return toAppSettingsVersion(current);
	}

	/**
	 * Применяет разрешённые изменения snapshot и преобразует ошибку их валидации в стандартную ошибку
	 * INVALID для настроек.
	 */
	private applyChanges(snapshot: StoredAppSettings, changes: AppSettingsChanges): StoredAppSettings {
		try {
			return applyAppSettingsChanges(snapshot, changes);
		} catch (error) {
			if (!(error instanceof InvalidAppSettingsChangesError)) {
				throw error;
			}

			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.APP_SETTINGS,
			});
		}
	}

	/**
	 * Проверяет, что значение является положительным целым int32; при нарушении возвращает INVALID для
	 * настроек.
	 */
	private validatePositiveInt32(value: number): void {
		if (!Number.isSafeInteger(value) || value < MIN_POSITIVE_INTEGER || value > INT32_MAX) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
				entity: ApiEntityNames.APP_SETTINGS,
			});
		}
	}
}
