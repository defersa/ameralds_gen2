import { ApiErrorCodes } from "@ameralds/utils";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { DataSource, LessThan, Raw, Repository } from "typeorm";
import { ModelState } from "../abstract/abstract.model";
import { PasswordResetLinkEntity } from "../entities/tokens/password-reset-link.entity";
import { UserEntity, UserStatus } from "../entities/user.entity";
import { TokenEntity } from "../entities/tokens/token.entity";
import { AuthEmailRequestEntity, AuthEmailRequestKind } from "../entities/tokens/auth-email-request.entity";


@Injectable()
export class PasswordResetRepository extends Repository<PasswordResetLinkEntity> {
	/** Подключает хранилище ссылок; операции смены пароля используют общую блокировку строки пользователя. */
	constructor(source: DataSource) {
		super(PasswordResetLinkEntity, source.createEntityManager());
	}

	/** Сохраняет хеш ссылки для активного существующего аккаунта, включая аккаунт без пароля; иначе возвращает false. */
	public async issue(email: string, tokenHash: string, expiresAt: Date): Promise<boolean> {
		return this.manager.transaction(async (manager) => {
			// Блокировка пользователя согласована с consume, refresh и созданием сессии; фиксируем версию учётных данных.
			const user = await manager.getRepository(UserEntity).findOne({
				where: {
					email: Raw((alias) => `LOWER(${alias}) = :email`, { email: email.trim().toLowerCase() }),
					state: ModelState.ACTIVE,
				},
				lock: { mode: "pessimistic_write" },
			});

			if (!user) {
				return false;
			}

			await manager.getRepository(PasswordResetLinkEntity).insert({
				userId: user.id,
				email: user.email,
				authVersion: user.authVersion,
				tokenHash,
				expiresAt,
				usedAt: null,
			});
			return true;
		});
	}

	/** Проверяет ссылку для отображения формы без погашения и изменения сессий; перед сохранением проверка повторяется под блокировкой. */
	public isUsable(tokenHash: string): Promise<boolean> {
		// Сверяем срок, одноразовость, email и версию активного владельца; токен предоставляет только доступ к форме.
		return this.createQueryBuilder("link")
			.innerJoin("link.user", "user")
			.where("link.tokenHash = :tokenHash", { tokenHash })
			.andWhere("link.usedAt IS NULL")
			.andWhere("link.expiresAt > :now", { now: new Date() })
			.andWhere("user.state = :state", { state: ModelState.ACTIVE })
			.andWhere("link.authVersion = user.authVersion")
			.andWhere("LOWER(link.email) = LOWER(user.email)")
			.getExists();
	}

	/**
	 * По одноразовому токену атомарно меняет пароль, отзывает все сессии и ссылки, ставит уведомление в очередь.
	 * Блокирует сначала пользователя, затем ссылку; неверная, истёкшая, использованная ссылка или неактивный аккаунт дают EXPIRED.
	 */
	public async consume(tokenHash: string, passwordHash: string): Promise<void> {
		await this.manager.transaction(async (manager) => {
			const links = manager.getRepository(PasswordResetLinkEntity);

			// Читаем только привязку токена; проверка срока и одноразовости будет повторена после блокировки пользователя.
			const subject = await links.findOneBy({ tokenHash });

			if (!subject) {
				throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
			}

			// Общая блокировка сериализует смену пароля, refresh и создание сессий одного пользователя.
			const user = await manager.getRepository(UserEntity).findOne({
				where: {
					id: subject.userId,
					state: ModelState.ACTIVE,
				},
				lock: { mode: "pessimistic_write" },
			});

			// После ожидания блокировки перечитываем ссылку, чтобы параллельное использование не прошло дважды.
			const link = await links.findOne({
				where: {
					id: subject.id,
					tokenHash,
				},
				lock: { mode: "pessimistic_write" },
			});

			if (
				!user ||
				!link ||
				link.usedAt ||
				link.expiresAt <= new Date() ||
				link.authVersion !== user.authVersion ||
				link.email.toLowerCase() !== user.email.toLowerCase()
			) {
				throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
			}

			// Увеличение версии немедленно запрещает ранее выданные ссылки входа и подтверждения, включая гонку их погашения.
			await manager.getRepository(UserEntity).update(user.id, {
				passwordHash,
				authVersion: user.authVersion + 1,
				status: UserStatus.VERIFIED,
			});

			// Отзываем access и refresh всех сессий владельца ссылки; текущий cookie запроса здесь не используется.
			await manager
				.getRepository(TokenEntity)
				.createQueryBuilder()
				.update()
				.set({ state: ModelState.INACTIVE })
				.where('"userId" = :userId', { userId: user.id })
				.execute();

			// Погашаем все выпущенные ссылки установки пароля, сохраняя одноразовость при повторной отправке.
			await links.update({ userId: user.id }, { usedAt: new Date() });

			// Уведомление фиксируется в той же транзакции, доставка выполняется существующей почтовой очередью после commit.
			await manager.getRepository(AuthEmailRequestEntity).insert({
				kind: AuthEmailRequestKind.PASSWORD_CHANGED,
				email: user.email,
				passwordHash: null,
				redirectPath: "/",
				availableAt: new Date(),
			});
		});
	}

	/** Удаляет истёкшие ссылки независимо от их использования; выполняется ежедневной задачей очистки. */
	public async deleteExpired(): Promise<void> {
		// Истёкшие токены уже не могут изменить пароль и не нужны для проверки повторного использования.
		await this.delete({ expiresAt: LessThan(new Date()) });
	}
}
