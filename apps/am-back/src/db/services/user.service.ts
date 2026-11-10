import { ApiErrorCodes } from "@ameralds/utils";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { type EntityManager, Raw, Repository } from "typeorm";
import { UserProfileDto } from "../../modules/user/user.dto";
import { ModelState } from "../abstract/abstract.model";
import { DataSourceService } from "../data-source.service";
import { UserEntity, UserStatus } from "../entities/user.entity";
import { SessionTokens, TokenService } from "./token.service";
import { PendingRegistrationRepository } from "../repositories/pending-registration.repository";


// Сравнение выполняется и для неизвестного email, чтобы не раскрывать наличие пользователя по времени ответа.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("invalid-user-password", 10);

@Injectable()
export class UserService {
	private userRepository: Repository<UserEntity>;

	/** Подключает репозитории пользователей, ожидающих регистраций и управление сессиями. */
	constructor(
		private dataSource: DataSourceService,
		private tokenService: TokenService,
		private readonly pendingRegistrations: PendingRegistrationRepository,
	) {
		this.userRepository = this.dataSource.getRepository(UserEntity);
	}

	/** Ищет пользователя по email без учёта регистра, включая неактивные аккаунты. */
	public getUserByEmail(email: string): Promise<UserEntity> {
		// Сравниваем email без учёта регистра с привязанным параметром, не исключая неактивные аккаунты.
		return this.userRepository.findOne({
			where: {
				email: Raw((alias) => "LOWER(" + alias + ") = :email", {
					email: email.toLowerCase(),
				}),
			},
		});
	}

	/**
	 * Находит или создаёт пользователя без пароля в переданной транзакции, сохраняя учётные данные
	 * существующего аккаунта.
	 */
	public getOrCreateUserWithoutPassword(email: string, manager: EntityManager): Promise<UserEntity> {
		return this.getOrCreateUser(email, manager, { passwordHash: null });
	}

	/**
	 * Возвращает идентификатор покупателя по email, создавая при необходимости аккаунт без пароля в
	 * переданной транзакции.
	 */
	public async getOrCreateBuyerId(email: string, manager: EntityManager): Promise<number> {
		return (await this.getOrCreateUserWithoutPassword(email, manager)).id;
	}

	/**
	 * Находит аккаунт или создаёт подтверждённого пользователя с хешем пароля, не меняя пароль
	 * существующего аккаунта.
	 */
	public getOrCreateRegisteredUser(email: string, passwordHash: string, manager: EntityManager): Promise<UserEntity> {
		return this.getOrCreateUser(email, manager, {
			passwordHash,
			status: UserStatus.VERIFIED,
		});
	}

	/**
	 * Проверяет и нормализует email, блокирует найденный аккаунт и создаёт отсутствующий через ON CONFLICT
	 * DO NOTHING. Требует транзакционный manager.
	 */
	private async getOrCreateUser(
		email: string,
		manager: EntityManager,
		credentials: { passwordHash: string | null; status?: UserStatus },
	): Promise<UserEntity> {
		if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID_EMAIL,
			});
		}

		email = email.trim().toLowerCase();

		const repository = manager.getRepository(UserEntity);

		// Готовим регистронезависимый поиск email с блокировкой строки пользователя внутри транзакции.
		const options = {
			where: {
				email: Raw((alias) => "LOWER(" + alias + ") = :email", { email }),
			},
			lock: {
				mode: "pessimistic_write" as const,
			},
		};

		const user = await repository.findOne(options);

		if (user) {
			return user;
		}

		// Уникальный индекс email и ON CONFLICT защищают от одновременной регистрации.
		await repository
			.createQueryBuilder()
			.insert()
			.values({
				email,
				username: email.split("@")[0],
				...credentials,
			})
			.orIgnore()
			.execute();

		return repository.findOneOrFail(options);
	}

	/**
	 * Для отсутствующего аккаунта с действующей ссылкой регистрации возвращает EMAIL_CONFIRMATION_REQUIRED
	 * независимо от пароля. Для существующего аккаунта проверяет пароль и активность перед выдачей сессии;
	 * остальные отказы возвращают INVALID_CREDENTIALS.
	 */
	public async signIn(email: string, password: string): Promise<SessionTokens> {
		// Находим учётные данные по email без учёта регистра, выбирая только id, хеш пароля и состояние.
		const user = await this.userRepository.findOne({
			where: {
				email: Raw((alias) => "LOWER(" + alias + ") = :email", {
					email: email.toLowerCase(),
				}),
			},
			select: {
				id: true,
				passwordHash: true,
				state: true,
			},
		});

		if (!user && await this.pendingRegistrations.hasActiveLinkForEmail(email)) {
			throw new UnauthorizedException({
				code: ApiErrorCodes.EMAIL_CONFIRMATION_REQUIRED,
			});
		}

		const validPassword = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

		if (!user || !user.passwordHash || !validPassword || user.state !== ModelState.ACTIVE) {
			throw new UnauthorizedException({
				code: ApiErrorCodes.INVALID_CREDENTIALS,
			});
		}

		const tokens = await this.tokenService.createSession(user.id);

		if (!tokens) {
			throw new UnauthorizedException({
				code: ApiErrorCodes.INVALID_CREDENTIALS,
			});
		}

		return tokens;
	}

	/** Ротирует refresh-токен сессии; недействительный токен даёт null. */
	public refreshToken(refresh: string): Promise<SessionTokens | null> {
		return this.tokenService.rotateRefreshToken(refresh);
	}

	/** Отзывает сессию, определённую refresh-токеном. */
	public logout(refresh: string): Promise<void> {
		return this.tokenService.revokeSession(refresh);
	}

	/** Возвращает пользователя по действующему access-токену или null. */
	public getUserByToken(token: string): Promise<UserEntity | null> {
		return this.tokenService.getUserByAccessToken(token);
	}

	/**
	 * Возвращает профиль активного пользователя с активными приобретёнными схемами и размерами; при
	 * отсутствии пользователя возвращает UNAUTHORIZED.
	 */
	public async getUser(id: number): Promise<UserProfileDto> {
		const user = await this.userRepository.findOne({
			where: {
				id,
				state: ModelState.ACTIVE,
			},
			relations: {
				ownPatterns: {
					pattern: true,
					sizes: { size: true },
				},
			},
		});

		if (!user) {
			throw new UnauthorizedException({
				code: ApiErrorCodes.UNAUTHORIZED,
			});
		}

		return {
			id: user.id,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			email: user.email,
			username: user.username,
			role: user.role,
			ownPatterns: (user.ownPatterns ?? [])
				.filter((item) => item.state === ModelState.ACTIVE)
				.map((item) => ({
					id: item.id,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
					color: item.color,
					pattern: item.pattern
						? {
							id: item.pattern.id,
							createdAt: item.pattern.createdAt,
							updatedAt: item.pattern.updatedAt,
						}
						: null,
					sizes: (item.sizes ?? [])
						.filter((size) => size.state === ModelState.ACTIVE)
						.map((size) => ({
							id: size.id,
							createdAt: size.createdAt,
							updatedAt: size.updatedAt,
							size: size.size
								? {
									id: size.size.id,
									value: size.size.value,
									createdAt: size.size.createdAt,
								}
								: null,
						})),
				})),
		};
	}
}
