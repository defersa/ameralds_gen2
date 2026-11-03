import { BadRequestException, ConflictException, Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { DataSourceService } from '../../data-source.service';
import { AppSettingEntity } from '../../entities/app-setting.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import {
    APP_SETTINGS_REGISTRY, AppSettingKey, AppSettingValue, AppSettingsChanges, DEFAULT_APP_SETTINGS,
    InvalidAppSettingsChangesError, applyAppSettingsChanges, effectiveSetting, readStoredSetting, validateStoredAppSettings,
} from './app-settings.schema';

@Injectable()
export class AppSettingsService implements OnModuleInit {
    constructor(private readonly source: DataSourceService) {}

    public async onModuleInit(): Promise<void> {
        await this.current();
    }

    /** Без кэша: новое значение сразу видно всем backend-инстансам. */
    public async current(manager = this.source.dataSource.manager): Promise<AppSettingEntity> {
        const current = await this.findCurrent(manager);
        if (current) return current;
        if (manager.queryRunner?.isTransactionActive) {
            await this.lock(manager);
            return await this.findCurrent(manager) ?? this.initialize(manager);
        }
        return this.source.dataSource.transaction('READ COMMITTED', async transaction => {
            await this.lock(transaction);
            return await this.findCurrent(transaction) ?? this.initialize(transaction);
        });
    }

    public async getRaw<K extends AppSettingKey>(key: K): Promise<AppSettingValue<K> | undefined> {
        return readStoredSetting((await this.current()).snapshot, key);
    }

    public async get<K extends AppSettingKey>(key: K): Promise<AppSettingValue<K>> {
        return effectiveSetting(readStoredSetting((await this.current()).snapshot, key), APP_SETTINGS_REGISTRY[key]);
    }

    public async version(version: number): Promise<AppSettingEntity> {
        this.validatePageOrVersion(version);
        const result = await this.source.getRepository(AppSettingEntity).findOne({
            where: { version }, relations: { createdBy: true },
            select: { version: true, snapshot: true, createdAt: true, createdById: true, createdBy: { id: true, username: true, email: true } },
        });
        if (!result) throw new BadRequestException({ code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.APP_SETTINGS });
        validateStoredAppSettings(result.snapshot);
        return result;
    }

    public async history(page: number): Promise<{ items: AppSettingEntity[]; page: number; count: number; total: number; activeVersion: number | null }> {
        this.validatePageOrVersion(page);
        const take = 10;
        // Один snapshot БД для строк, total и маркировки активной версии.
        return this.source.dataSource.transaction('REPEATABLE READ', async manager => {
            const repository = manager.getRepository(AppSettingEntity);
            const [items, total] = await repository.findAndCount({
                order: { version: 'DESC' }, take, skip: (page - 1) * take,
                relations: { createdBy: true },
                select: { version: true, snapshot: true, createdAt: true, createdById: true, createdBy: { id: true, username: true, email: true } },
            });
            for (const item of items) validateStoredAppSettings(item.snapshot);
            const active = await this.findCurrent(manager);
            return { items, page, count: Math.ceil(total / take), total, activeVersion: active?.version ?? null };
        });
    }

    private validatePageOrVersion(value: number): void {
        if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.APP_SETTINGS });
        }
    }

    /** Вызывать из admin-only API (AMS-6); createdById берётся из проверенного RequestModel.user. */
    public async createVersion(expectedVersion: number, changes: AppSettingsChanges, createdById: number): Promise<AppSettingEntity> {
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || !Number.isSafeInteger(createdById) || createdById < 1) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.APP_SETTINGS });
        }
        return this.source.dataSource.transaction('READ COMMITTED', async manager => {
            // Блокировка существует и при пустой таблице; общая для инициализации и всех писателей.
            await this.lock(manager);
            const previous = await this.findCurrent(manager) ?? await this.initialize(manager);
            if (previous.version !== expectedVersion) {
                throw new ConflictException({ code: ApiErrorCodes.VERSION_CONFLICT, entity: ApiEntityNames.APP_SETTINGS });
            }
            let snapshot;
            try {
                snapshot = applyAppSettingsChanges(previous.snapshot, changes);
            } catch (error) {
                if (!(error instanceof InvalidAppSettingsChangesError)) throw error;
                throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.APP_SETTINGS });
            }
            return manager.getRepository(AppSettingEntity).save({ version: previous.version + 1, snapshot, createdById });
        });
    }

    private async findCurrent(manager: EntityManager): Promise<AppSettingEntity | null> {
        const current = await manager.getRepository(AppSettingEntity).findOne({ where: {}, order: { version: 'DESC' } });
        if (current) validateStoredAppSettings(current.snapshot);
        return current;
    }

    private async initialize(manager: EntityManager): Promise<AppSettingEntity> {
        return manager.getRepository(AppSettingEntity).save({
            version: 1, snapshot: structuredClone(DEFAULT_APP_SETTINGS), createdById: null,
        });
    }

    private async lock(manager: EntityManager): Promise<void> {
        await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [0x414d5354, 1]);
    }
}
