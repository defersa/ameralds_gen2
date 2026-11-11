import { ApiErrorCodes, isStrongPassword } from "@ameralds/utils";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { hash } from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { PasswordResetRepository } from "../repositories/password-reset.repository";
import { authEmailUrl } from "../utils/auth-email-url";


export const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PasswordResetService {
	/** Подключает транзакционное хранилище ссылок установки пароля. */
	constructor(private readonly links: PasswordResetRepository) {}

	/** Выпускает ссылку на 24 часа в фоновом обработчике; для неизвестного или неактивного email возвращает null. */
	public async createLink(email: string): Promise<string | null> {
		const token = randomBytes(32).toString("base64url");
		const url = authEmailUrl("/auth/password", token);
		const issued = await this.links.issue(
			email,
			this.hashToken(token),
			new Date(Date.now() + PASSWORD_RESET_TTL_MS),
		);

		return issued ? url : null;
	}

	/** Проверяет доступность формы по токену, не погашая ссылку и не создавая сессию; отказ даёт 401 EXPIRED. */
	public async validate(token: string): Promise<void> {
		const tokenHash = this.checkedTokenHash(token);

		if (!(await this.links.isUsable(tokenHash))) {
			throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
		}
	}

	/** Проверяет новый пароль и одноразовый токен; ошибки валидации дают 400, недействительная ссылка — 401 EXPIRED. */
	public async change(token: string, password: string, passwordRepeat: string): Promise<void> {
		const tokenHash = this.checkedTokenHash(token);

		if (!isStrongPassword(password) || password !== passwordRepeat) {
			throw new BadRequestException({ code: ApiErrorCodes.INVALID_PASSWORD });
		}

		const passwordHash = await hash(password, 10);

		await this.links.consume(tokenHash, passwordHash);
	}

	/** Проверяет формат секрета до обращения к БД и хеширования пароля, иначе возвращает 401 EXPIRED. */
	private checkedTokenHash(token: string): string {
		if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
			throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
		}

		return this.hashToken(token);
	}

	/** Возвращает SHA-256 токена, чтобы исходный секрет не сохранялся в БД. */
	private hashToken(token: string): string {
		return createHash("sha256").update(token).digest("hex");
	}

	/** Ежедневно удаляет истёкшие ссылки установки пароля. */
	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	public async deleteExpiredLinks(): Promise<void> {
		await this.links.deleteExpired();
	}
}
