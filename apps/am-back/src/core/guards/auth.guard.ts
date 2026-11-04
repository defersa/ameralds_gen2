import { ApiErrorCodes } from "@ameralds/utils";
import {
	applyDecorators,
	CanActivate,
	ExecutionContext,
	Injectable,
	SetMetadata,
	UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Reflector } from "@nestjs/core";
import type { RequestModel } from "@am-back/models/request.model";


export const AUTH_KEY = "auth";
/** Помечает обработчик или контроллер как требующий авторизации и добавляет Bearer-схему в Swagger. */
export const Auth = () => applyDecorators(SetMetadata(AUTH_KEY, true), ApiBearerAuth());

@Injectable()
export class AuthGuard implements CanActivate {
	/** Подключает Reflector для чтения требования авторизации из метаданных маршрута. */
	constructor(private reflector: Reflector) {}

	/**
	 * Разрешает публичные маршруты; для закрытых требует пользователя, установленного middleware, иначе
	 * возвращает UNAUTHORIZED.
	 */
	canActivate(context: ExecutionContext): boolean {
		const requiredAuth: boolean = this.reflector.getAllAndOverride<boolean>(AUTH_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredAuth) {
			return true;
		}

		const { user }: RequestModel = context.switchToHttp().getRequest();

		if (!user) {
			throw new UnauthorizedException({
				code: ApiErrorCodes.UNAUTHORIZED,
			});
		}

		return true;
	}
}
