import { ApiErrorCodes } from "@ameralds/utils";
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiBody,
	ApiNoContentResponse,
	ApiOkResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { UserService } from "@am-back/db/service/user.service";
import {
	EmailLoginRequestDto,
	EmailLoginResponseDto,
	EmailLoginTokenDto,
	UserCredentialsDto,
	UserProfileDto,
	UserRegistrationCredentialsDto,
	UserTokensDTO,
	PasswordResetRequestDto,
	PasswordResetDto,
	PasswordResetTokenDto,
} from "./user.dto";
import { ErrorsDto } from "../errors/errors.dto";
import { Auth } from "@am-back/core/guards/auth.guard";
import type { RequestModel } from "@am-back/models/request.model";
import { UserCredentialsPipe, UserRegistrationCredentialsPipe } from "./user-credentials.pipe";
import {
	AuthEmailMutation,
	clearRefreshCookie,
	readRefreshCookie,
	RefreshCookieAuth,
	SessionMutation,
	setRefreshCookie,
} from "./session-http";
import { EmailLoginService } from "../../db/services/email-login.service";
import { EmailAddressPipe } from "./email-address.pipe";
import { AuthEmailService } from "../../db/services/auth-email.service";
import { PasswordResetService } from '../../db/services/password-reset.service';


@Controller("user")
@ApiTags("user")
export class UserController {
	/** Подключает операции аккаунта, установку пароля по токену, вход по ссылкам и очередь писем авторизации. */
	constructor(
		private userService: UserService,
		private emailLoginService: EmailLoginService,
		private authEmail: AuthEmailService,
		private readonly passwordReset: PasswordResetService,
	) {}

	/** Принимает запрос письма установки пароля без раскрытия наличия аккаунта; текущая сессия не используется. */
	@Post('password/request')
	@HttpCode(HttpStatus.NO_CONTENT)
	@AuthEmailMutation()
	@Throttle({
		default: {
			limit: 5,
			ttl: 60_000,
		},
	})
	@ApiBody({ type: PasswordResetRequestDto })
	@ApiNoContentResponse({ description: 'Queues password setup or recovery email with an identical empty response for all account states.' })
	@ApiBadRequestResponse({ type: ErrorsDto })
	public async requestPasswordReset(@Body('email', EmailAddressPipe) email: string): Promise<void> {
		await this.authEmail.requestPasswordReset(email);
	}

	/** Проверяет ссылку для показа формы, не меняя пароль, cookie и сессии; для недействительного токена возвращает EXPIRED. */
	@Post('password/validate')
	@HttpCode(HttpStatus.NO_CONTENT)
	@SessionMutation()
	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@ApiBody({ type: PasswordResetTokenDto })
	@ApiNoContentResponse({ description: 'The password token is currently valid. Does not consume it or create a session.' })
	@ApiUnauthorizedResponse({ type: ErrorsDto })
	public async validatePasswordReset(@Body('token') token: string): Promise<void> {
		await this.passwordReset.validate(token);
	}

	/** Меняет пароль только по токену, отзывает все сессии его владельца и очищает cookie браузера без автоматического входа. */
	@Post('password/reset')
	@HttpCode(HttpStatus.NO_CONTENT)
	@SessionMutation()
	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@ApiNoContentResponse({ description: 'Changes the password, consumes all reset links, revokes prior login links and all owner sessions, and clears the browser refresh cookie. Does not sign in.' })
	@ApiUnauthorizedResponse({
		type: ErrorsDto,
		description: 'EXPIRED for invalid, expired, consumed or revoked tokens and inactive accounts.',
	})
	@ApiBadRequestResponse({ type: ErrorsDto })
	public async resetPassword(
		@Body() body: PasswordResetDto,
		@Res({ passthrough: true }) response: Response,
	): Promise<void> {
		await this.passwordReset.change(body?.token, body?.password, body?.passwordRepeat);
		clearRefreshCookie(response);
	}

	/** Принимает запрос письма входа в фоновую очередь без раскрытия существования или состояния аккаунта. */
	@Post("email-login/request")
	@HttpCode(HttpStatus.NO_CONTENT)
	@AuthEmailMutation()
	@Throttle({
		default: {
			limit: 5,
			ttl: 60_000,
		},
	})
	@ApiBody({ type: EmailLoginRequestDto })
	@ApiNoContentResponse({
		description:
			"Accepts the request for background processing. Status and body are identical for unknown, active and inactive accounts; SMTP delivery does not affect the response.",
	})
	@ApiBadRequestResponse({ type: ErrorsDto })
	public async requestEmailLogin(
		@Body("email", EmailAddressPipe) email: string,
		@Body("redirectPath") redirectPath?: string,
	): Promise<void> {
		await this.authEmail.requestLogin(email, redirectPath);
	}

	/**
	 * Погашает одноразовую ссылку входа или регистрации, устанавливает refresh-cookie и возвращает
	 * access-токен с локальным путём перехода.
	 */
	@Post("email-login/consume")
	@HttpCode(HttpStatus.OK)
	@SessionMutation()
	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@ApiBody({ type: EmailLoginTokenDto })
	@ApiOkResponse({
		description:
			"Consumes a single-use login or registration confirmation link, creates a browser session and returns its local destination. Refresh token is set as an HttpOnly cookie.",
		type: EmailLoginResponseDto,
	})
	@ApiUnauthorizedResponse({
		description: "The link is invalid, expired, used or belongs to an inactive account.",
		type: ErrorsDto,
	})
	public async signInByEmail(
		@Body("token") token: string,
		@Res({ passthrough: true }) response: Response,
	): Promise<EmailLoginResponseDto> {
		const session = await this.emailLoginService.signIn(token);

		setRefreshCookie(response, session);
		return {
			access: session.access,
			redirectPath: session.redirectPath,
		};
	}

	/** Ставит запрос регистрации в очередь; создание аккаунта происходит после подтверждения email. */
	@Post("register")
	@HttpCode(HttpStatus.NO_CONTENT)
	@AuthEmailMutation()
	@Throttle({
		default: {
			limit: 5,
			ttl: 60_000,
		},
	})
	@ApiNoContentResponse({
		description:
			"Accepts a registration request without revealing account existence. New accounts are created after email confirmation; existing accounts receive a login link without changes to their password.",
	})
	@ApiBadRequestResponse({ type: ErrorsDto })
	public async register(
		@Body(UserRegistrationCredentialsPipe) { email, password }: UserRegistrationCredentialsDto,
	): Promise<void> {
		await this.authEmail.requestRegistration(email, password);
	}

	/**
	 * Выполняет вход по email и паролю, устанавливает refresh-cookie и возвращает только access-токен в
	 * JSON. Любые отклонённые учётные данные возвращают INVALID_CREDENTIALS без раскрытия наличия
	 * аккаунта или ожидающей подтверждения регистрации.
	 */
	@Post("sign-in")
	@HttpCode(HttpStatus.OK)
	@SessionMutation()
	@Throttle({
		default: {
			limit: 10,
			ttl: 60_000,
		},
	})
	@ApiOkResponse({
		description: "Access token; refresh token is set as an HttpOnly cookie.",
		type: UserTokensDTO,
	})
	@ApiUnauthorizedResponse({
		type: ErrorsDto,
		description: "INVALID_CREDENTIALS for all rejected credentials, including unknown emails, pending registrations, incorrect passwords and inactive accounts. No session is created before email confirmation.",
	})
	@ApiBadRequestResponse({ type: ErrorsDto })
	public async signIn(
		@Body(UserCredentialsPipe) { email, password }: UserCredentialsDto,
		@Res({ passthrough: true }) response: Response,
	): Promise<UserTokensDTO> {
		const tokens = await this.userService.signIn(email, password);

		setRefreshCookie(response, tokens);
		return {
			access: tokens.access,
		};
	}

	/**
	 * Ротирует refresh-cookie и access-токен; при недействительной сессии очищает cookie и возвращает
	 * EXPIRED.
	 */
	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	@SessionMutation()
	@RefreshCookieAuth()
	@ApiOkResponse({
		description: "Rotates the refresh cookie and issues a new access token.",
		type: UserTokensDTO,
	})
	@ApiUnauthorizedResponse({ type: ErrorsDto })
	public async refresh(
		@Req() request: RequestModel,
		@Res({ passthrough: true }) response: Response,
	): Promise<UserTokensDTO> {
		const tokens = await this.userService.refreshToken(readRefreshCookie(request));

		if (!tokens) {
			clearRefreshCookie(response);
			throw new UnauthorizedException({
				code: ApiErrorCodes.EXPIRED,
			});
		}

		setRefreshCookie(response, tokens);
		return {
			access: tokens.access,
		};
	}

	/** Отзывает сессию по refresh-cookie и очищает cookie без требования действующего access-токена. */
	@Post("logout")
	@HttpCode(HttpStatus.NO_CONTENT)
	@SessionMutation()
	@RefreshCookieAuth()
	@ApiNoContentResponse({ description: "The session has been revoked and the refresh cookie cleared." })
	public async logout(@Req() request: RequestModel, @Res({ passthrough: true }) response: Response): Promise<void> {
		await this.userService.logout(readRefreshCookie(request));
		clearRefreshCookie(response);
	}

	/** Возвращает профиль текущего авторизованного пользователя с запретом кеширования ответа. */
	@Get("profile")
	@Auth()
	@ApiOkResponse({ type: UserProfileDto })
	@ApiUnauthorizedResponse({ type: ErrorsDto })
	public async profile(
		@Req() request: RequestModel,
		@Res({ passthrough: true }) response: Response,
	): Promise<UserProfileDto> {
		response.setHeader("Cache-Control", "no-store");
		return this.userService.getUser(request.user.id);
	}
}
