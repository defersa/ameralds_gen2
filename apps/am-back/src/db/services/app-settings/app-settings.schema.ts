/**
 * Схема только расширяется: не удалять/переименовывать поля и не менять их
 * тип или смысл. Устаревшие поля помечать @deprecated и сохранять в snapshot.
 * Секреты и конфигурация инфраструктуры сюда не входят.
 */
export interface AppSettingsSchema {
    orders: {
        paymentExpirationDays: number;
    };
}

/** Старые snapshot могут не содержать новых полей, а новые — неизвестные этому коду. */
export interface StoredAppSettings {
    [section: string]: unknown;
    orders?: {
        [key: string]: unknown;
        paymentExpirationDays?: number;
    };
}

export type AppSettingKey = 'orders.paymentExpirationDays';
export type AppSettingValue<K extends AppSettingKey> = {
    'orders.paymentExpirationDays': AppSettingsSchema['orders']['paymentExpirationDays'];
}[K];
export type AppSettingsChanges = Partial<{ orders: Partial<AppSettingsSchema['orders']> }>;

export const DEFAULT_APP_SETTINGS: Readonly<{ orders: Readonly<AppSettingsSchema['orders']> }> = Object.freeze({
    orders: Object.freeze({ paymentExpirationDays: 7 }),
});

export interface SettingDefinition<T> {
    readonly defaultValue: T;
    readonly validate: (value: unknown) => value is T;
    readonly min?: number;
    readonly max?: number;
}

export const APP_SETTINGS_REGISTRY = {
    'orders.paymentExpirationDays': {
        defaultValue: DEFAULT_APP_SETTINGS.orders.paymentExpirationDays,
        min: 1,
        max: 365,
        validate: (value: unknown): value is number => typeof value === 'number'
            && Number.isInteger(value) && value >= 1 && value <= 365,
    },
} as const satisfies { [K in AppSettingKey]: SettingDefinition<AppSettingValue<K>> };

export class InvalidStoredAppSettingsError extends Error {}
export class InvalidAppSettingsChangesError extends Error {}

export function isSettingsObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** undefined означает отсутствие; null и неверные типы никогда не превращаются в default. */
export function readSetting<T>(value: unknown, definition: SettingDefinition<T>): T | undefined {
    if (value === undefined) return undefined;
    if (!definition.validate(value)) throw new InvalidStoredAppSettingsError('Invalid stored setting value');
    return value;
}

export function effectiveSetting<T>(value: unknown, definition: SettingDefinition<T>): T {
    const raw = readSetting(value, definition);
    return raw === undefined ? definition.defaultValue : raw;
}

export function readStoredSetting<K extends AppSettingKey>(snapshot: StoredAppSettings, key: K): AppSettingValue<K> | undefined {
    const [section, name] = key.split('.');
    const values = snapshot[section];
    if (values !== undefined && !isSettingsObject(values)) {
        throw new InvalidStoredAppSettingsError(`${section} must be an object`);
    }
    return readSetting(values?.[name], APP_SETTINGS_REGISTRY[key]);
}

export function validateStoredAppSettings(value: unknown): asserts value is StoredAppSettings {
    if (!isSettingsObject(value)) throw new InvalidStoredAppSettingsError('Snapshot must be an object');
    for (const key of Object.keys(APP_SETTINGS_REGISTRY) as AppSettingKey[]) {
        readStoredSetting(value, key);
    }
}

export function applyAppSettingsChanges(snapshot: StoredAppSettings, changes: unknown): StoredAppSettings {
    validateStoredAppSettings(snapshot);
    if (!isSettingsObject(changes) || Object.keys(changes).length === 0) {
        throw new InvalidAppSettingsChangesError('Changes must be a non-empty object');
    }
    // Не материализуем defaults и не теряем неизвестные/deprecated поля предыдущей версии.
    const result = structuredClone(snapshot);
    for (const [section, values] of Object.entries(changes)) {
        if (!isSettingsObject(values) || Object.keys(values).length === 0) {
            throw new InvalidAppSettingsChangesError('Changes must contain setting values');
        }
        for (const [name, value] of Object.entries(values)) {
            const key = `${section}.${name}`;
            if (!Object.prototype.hasOwnProperty.call(APP_SETTINGS_REGISTRY, key)
                || !APP_SETTINGS_REGISTRY[key as AppSettingKey].validate(value)) {
                throw new InvalidAppSettingsChangesError(`Unknown setting or invalid value: ${key}`);
            }
            result[section] = { ...result[section] as Record<string, unknown>, [name]: value };
        }
    }
    return result;
}
