import { FIRST_PAGE } from "@ameralds/utils";
import { AppSettingEntity } from "@am-back/db/entities/app-setting.entity";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, Repository } from "typeorm";
import type { StoredAppSettings } from "../app-settings.schema";


const authorSelection = {
	version: true,
	snapshot: true,
	createdAt: true,
	createdById: true,
	createdBy: {
		id: true,
		username: true,
		email: true,
	},
} as const;

@Injectable()
export class AppSettingsRepository extends Repository<AppSettingEntity> {
	/** Инициализирует TypeORM-репозиторий версий настроек менеджером переданного источника данных. */
	constructor(dataSource: DataSource) {
		super(AppSettingEntity, dataSource.createEntityManager());
	}

	/**
	 * Загружает последнюю по номеру версию настроек с ограниченным набором полей автора; при отсутствии
	 * возвращает null.
	 */
	public findCurrent(manager?: EntityManager): Promise<AppSettingEntity | null> {
		return this.using(manager).findOne({
			where: {},
			order: { version: "DESC" },
			relations: { createdBy: true },
			select: authorSelection,
		});
	}

	/** Загружает конкретную версию настроек с ограниченным набором полей автора. */
	public findVersion(version: number, manager?: EntityManager): Promise<AppSettingEntity | null> {
		return this.using(manager).findOne({
			where: { version },
			relations: { createdBy: true },
			select: authorSelection,
		});
	}

	/** Возвращает страницу версий по убыванию номера и общее количество в переданной транзакции. */
	public findHistoryPage(page: number, take: number, manager: EntityManager): Promise<[AppSettingEntity[], number]> {
		return this.using(manager).findAndCount({
			order: { version: "DESC" },
			take,
			skip: (page - FIRST_PAGE) * take,
			relations: { createdBy: true },
			select: authorSelection,
		});
	}

	/** Сохраняет новую версию и повторно загружает её с данными автора в переданной транзакции. */
	public async insertVersion(
		version: number,
		snapshot: StoredAppSettings,
		createdById: number | null,
		manager: EntityManager,
	): Promise<AppSettingEntity> {
		const repository = this.using(manager);

		await repository.save({
			version,
			snapshot,
			createdById,
		});
		return repository.findOneOrFail({
			where: { version },
			relations: { createdBy: true },
			select: authorSelection,
		});
	}

	/** Сериализует создание версий настроек общей advisory-блокировкой до окончания переданной транзакции. */
	public async lockVersions(manager: EntityManager): Promise<void> {
		// Удерживаем общую advisory-блокировку версий до конца транзакции, включая случай пустого хранилища без
		// строк для FOR UPDATE.
		await manager.query("SELECT pg_advisory_xact_lock($1, $2)", [0x414d5354, 1]);
	}

	/**
	 * Выбирает репозиторий переданного manager либо текущий экземпляр при отсутствии транзакционного
	 * контекста.
	 */
	private using(manager?: EntityManager): Repository<AppSettingEntity> {
		return manager?.getRepository(AppSettingEntity) ?? this;
	}
}
