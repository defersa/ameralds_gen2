import type { AppSettingEntity } from "@am-back/db/entities/app-setting.entity";
import type { AppSettingsVersionDto } from "@am-back/modules/app-settings/app-settings.dto";
import { APP_SETTINGS_REGISTRY, effectiveSetting, validateStoredAppSettings } from "./app-settings.schema";


/**
 * Проверяет snapshot версии настроек и формирует DTO с безопасными полями автора и действующими значениями
 * с defaults.
 */
export function toAppSettingsVersion(
	version: Pick<AppSettingEntity, "version" | "snapshot" | "createdAt"> & {
		createdBy?: { id: number; username: string | null; email: string } | null;
	},
): AppSettingsVersionDto {
	validateStoredAppSettings(version.snapshot);
	return {
		version: version.version,
		createdAt: version.createdAt,
		snapshot: version.snapshot,
		createdBy: version.createdBy
			? {
				id: version.createdBy.id,
				username: version.createdBy.username,
				email: version.createdBy.email,
			}
			: null,
		effective: {
			orders: {
				paymentExpirationDays: effectiveSetting(
					version.snapshot.orders?.paymentExpirationDays,
					APP_SETTINGS_REGISTRY["orders.paymentExpirationDays"],
				),
			},
		},
	};
}
