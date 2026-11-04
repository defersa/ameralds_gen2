import { ApiErrorCodes } from "@ameralds/utils";
import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../db/entities/user.entity";


export const ROLES_KEY = "roles";
/** Записывает перечень допустимых ролей в метаданные обработчика или контроллера. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
	/** Подключает Reflector для чтения разрешённых ролей из метаданных маршрута. */
	constructor(private reflector: Reflector) {}

	/**
	 * Проверяет роль текущего пользователя; без ограничения ролей разрешает доступ, без пользователя
	 * возвращает UNAUTHORIZED.
	 */
	canActivate(context: ExecutionContext): boolean {
		const requiredRoles: UserRole[] = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredRoles) {
			return true;
		}

		const { user } = context.switchToHttp().getRequest();

		if (!user) {
			throw new UnauthorizedException({
				code: ApiErrorCodes.UNAUTHORIZED,
			});
		}

		return requiredRoles
			.some((role: UserRole) => user.role === role);
	}
}
