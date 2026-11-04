import { ApiErrorCodes } from "@ameralds/utils";
import {
	applyDecorators,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiHeader, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { HttpException, HttpStatus } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { ErrorsDto } from "../errors/errors.dto";
import { SessionTokens } from "../../db/services/token.service";
import { AuthEmailLimitService } from "../../db/services/auth-email-limit.service";
import { EmailAddressPipe } from "./email-address.pipe";


export const REFRESH_COOKIE_NAME = "am_refresh";
const COOKIE_PATH = "/api/user/user";

@Injectable()
export class SessionRequestGuard implements CanActivate {
	/** Проверяет обязательный CSRF-заголовок и отклоняет cross-site запросы к операциям сессии ошибкой 403. */
	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();

		// Произвольный сайт не может отправить этот заголовок без успешного CORS preflight.
		if (request.get("X-CSRF-Protection") !== "1" || request.get("Sec-Fetch-Site") === "cross-site") {
			throw new ForbiddenException({
				code: ApiErrorCodes.INVALID,
			});
		}

		return true;
	}
}

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
	/** Возвращает стандартную ошибку TOO_MANY_REQUESTS с HTTP-статусом 429 при превышении лимита запросов. */
	protected override async throwThrottlingException(): Promise<void> {
		throw new HttpException(
			{
				code: ApiErrorCodes.TOO_MANY_REQUESTS,
			},
			HttpStatus.TOO_MANY_REQUESTS,
		);
	}
}

@Injectable()
export class AuthEmailThrottleGuard implements CanActivate {
	/** Подключает сервис ограничений отправки писем по email и IP. */
	constructor(private limits: AuthEmailLimitService) {}

	/**
	 * Проверяет email и лимиты отправки писем по адресу и IP; при превышении выставляет Retry-After в
	 * секундах и возвращает 429.
	 */
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const http = context.switchToHttp();
		const request = http.getRequest<Request>();
		const email = new EmailAddressPipe().transform(request.body?.email);
		// Express учитывает forwarded-заголовки только от явно доверенных TRUST_PROXY.
		const retryAfter = await this.limits.consume(email, request.ip || request.socket.remoteAddress || "unknown");

		if (retryAfter > 0) {
			http.getResponse<Response>().setHeader("Retry-After", String(retryAfter));
			throw new HttpException(
				{
					code: ApiErrorCodes.TOO_MANY_REQUESTS,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		return true;
	}
}

/** Добавляет CSRF-проверку, ограничение частоты и Swagger-описание к операции изменения сессии. */
export const SessionMutation = () =>
	applyDecorators(
		UseGuards(SessionRequestGuard, AuthThrottleGuard),
		ApiHeader({
			name: "X-CSRF-Protection",
			required: true,
			schema: {
				type: "string",
				enum: ["1"],
			},
		}),
		ApiTooManyRequestsResponse({ type: ErrorsDto }),
	);

/** Дополняет защиту операции сессии ограничением отправки писем по email и IP. */
export const AuthEmailMutation = () => applyDecorators(SessionMutation(), UseGuards(AuthEmailThrottleGuard));

/** Объявляет в Swagger авторизацию операции через refresh-cookie. */
export const RefreshCookieAuth = () => ApiCookieAuth(REFRESH_COOKIE_NAME);

/** Читает единственную refresh-cookie; при дубликатах или ошибке URI-декодирования возвращает undefined. */
export function readRefreshCookie(request: Request): string | undefined {
	const cookies = (request.headers.cookie ?? "").split(";")
		.map((value) => value.trim());

	const values = cookies
		.filter((value) => value.startsWith(REFRESH_COOKIE_NAME + "="));

	if (values.length !== 1) {
		return undefined;
	}

	try {
		return decodeURIComponent(values[0]
			.slice(REFRESH_COOKIE_NAME.length + 1));
	} catch {
		return undefined;
	}
}

/** Возвращает общие параметры HttpOnly SameSite=Strict cookie с Secure вне dev и test и ограниченным путём. */
function cookieOptions(): CookieOptions {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV !== "dev" && process.env.NODE_ENV !== "test",
		sameSite: "strict",
		path: COOKIE_PATH,
	};
}

/** Устанавливает refresh-cookie до истечения токена и запрещает кеширование ответа сессии. */
export function setRefreshCookie(response: Response, tokens: SessionTokens): void {
	response.cookie(REFRESH_COOKIE_NAME, tokens.refresh, {
		...cookieOptions(),
		expires: tokens.refreshExpiredAt,
	});
	response.setHeader("Cache-Control", "no-store");
}

/** Удаляет refresh-cookie с теми же параметрами области действия и запрещает кеширование ответа. */
export function clearRefreshCookie(response: Response): void {
	response.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
	response.setHeader("Cache-Control", "no-store");
}
