import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { UserCredentialsDto } from "./user.dto";
import { EmailAddressPipe } from "./email-address.pipe";
import { ApiErrorCodes, isStrongPassword } from "@ameralds/utils";


@Injectable()
export class UserCredentialsPipe implements PipeTransform<unknown, UserCredentialsDto> {
	/**
	 * Проверяет объект учётных данных, нормализует email и ограничивает пароль 1024 байтами UTF-8; неверные
	 * данные возвращают стандартную ошибку валидации.
	 */
	public transform(value: unknown): UserCredentialsDto {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID,
			});
		}

		const { email, password } = value as Record<string, unknown>;
		const normalizedEmail = new EmailAddressPipe().transform(email);

		if (typeof password !== "string" || !password.length || Buffer.byteLength(password, "utf8") > 1024) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID_PASSWORD,
			});
		}

		return {
			email: normalizedEmail,
			password,
		};
	}
}

@Injectable()
export class UserRegistrationCredentialsPipe extends UserCredentialsPipe {
	/** Дополняет проверку учётных данных требованием надёжного пароля при регистрации. */
	public override transform(value: unknown): UserCredentialsDto {
		const credentials = super.transform(value);

		if (!isStrongPassword(credentials.password)) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID_PASSWORD,
			});
		}

		return credentials;
	}
}
