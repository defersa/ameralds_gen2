import { JwtService } from "@nestjs/jwt";
import { compare, hashSync } from "bcrypt";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { DataSource } from "typeorm";
import { PasswordResetLinks1794400000000 } from "../../../database/migrations/1794400000000-password-reset-links";
import { ModelState } from "../abstract/abstract.model";
import { DataSourceService } from "../data-source.service";
import { UserEntity, UserRole } from "../entities/user.entity";
import { AuthEmailRequestEntity, AuthEmailRequestKind } from "../entities/tokens/auth-email-request.entity";
import { PasswordResetRepository } from "../repositories/password-reset.repository";
import { PasswordResetService } from "./password-reset.service";
import { TokenService } from "./token.service";
import { UserService } from "./user.service";
import { EmailLoginService } from "./email-login.service";


const url = process.env.PASSWORD_RESET_TEST_DATABASE_URL;
const postgres = url ? describe : describe.skip;
const oldHash = hashSync("OldPassword123!", 10);

postgres("password reset invariants on PostgreSQL", () => {
	const database = `password_reset_test_${randomUUID().replace(/-/g, "")}`;
	const previousSite = process.env.SITE_URL;
	let admin: DataSource;
	let db: DataSource;
	let reset: PasswordResetService;
	let repository: PasswordResetRepository;
	let tokens: TokenService;
	let users: UserService;
	let emails: EmailLoginService;
	let user: UserEntity;
	let other: UserEntity;

	beforeAll(async () => {
		process.env.SITE_URL = "https://shop.example";
		admin = await new DataSource({
			type: "postgres",
			url,
		}).initialize();
		// Все тестовые изменения ограничены отдельной случайной БД; исходная БД из URL не изменяется.
		await admin.query(`CREATE DATABASE "${database}"`);

		const testUrl = new URL(url);

		testUrl.pathname = `/${database}`;
		db = await new DataSource({
			type: "postgres",
			url: testUrl.toString(),
			entities: [join(__dirname, "../entities/**/*.entity.ts")],
			extra: { max: 8 },
		}).initialize();
		// Создаём схемы тестовых сущностей и проверяем реальное применение up/down новой миграции.
		await db.query("CREATE SCHEMA users; CREATE SCHEMA patterns");
		await db.synchronize();
		await db.transaction(async (manager) => {
			const migration = new PasswordResetLinks1794400000000();

			await migration.down(manager.queryRunner);
			await migration.up(manager.queryRunner);
		});

		const source = new DataSourceService(db);

		repository = new PasswordResetRepository(db);
		reset = new PasswordResetService(repository);
		tokens = new TokenService(new JwtService({ secret: "test-only-password-reset-secret" }), source);
		users = new UserService(source, tokens);
		emails = new EmailLoginService(source, tokens, users);
	}, 30_000);

	beforeEach(async () => {
		// Очищаем только временную БД, включая связанные ссылки/сессии и не связанную внешним ключом очередь писем.
		await db.query('TRUNCATE "user_entity" RESTART IDENTITY CASCADE');
		await db.getRepository(AuthEmailRequestEntity).clear();
		user = await db.getRepository(UserEntity).save({
			email: "buyer@example.test",
			passwordHash: oldHash,
			role: UserRole.ADMIN,
		});
		other = await db.getRepository(UserEntity).save({
			email: "other@example.test",
			passwordHash: oldHash,
		});
	});

	afterAll(async () => {
		if (db?.isInitialized) {
			await db.destroy();
		}

		if (admin?.isInitialized) {
			// Удаляем только случайную БД, созданную данным тестом.
			await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
			await admin.destroy();
		}

		if (previousSite === undefined) {
			delete process.env.SITE_URL;
		} else {
			process.env.SITE_URL = previousSite;
		}
	});

	/** Выпускает настоящий почтовый токен без отправки письма, чтобы проверять весь путь изменения пароля. */
	async function issue(): Promise<string> {
		const link = await reset.createLink(user.email);

		return new URLSearchParams(new URL(link).hash.slice(1)).get("token");
	}

	it("skips unknown and inactive emails without creating accounts or links", async () => {
		await expect(reset.createLink("unknown@example.test")).resolves.toBeNull();
		await db.getRepository(UserEntity).update(user.id, { state: ModelState.INACTIVE });
		await expect(reset.createLink(user.email)).resolves.toBeNull();
		expect(await repository.count()).toBe(0);
		expect(await db.getRepository(UserEntity).count()).toBe(2);
	});

	it.each([oldHash, null])(
		"sets the first or replacement password and revokes only the owner sessions (%s)",
		async (hash) => {
			await db.getRepository(UserEntity).update(user.id, { passwordHash: hash });

			const first = await tokens.createSession(user.id);
			const second = await tokens.createSession(user.id);
			const unrelated = await tokens.createSession(other.id);
			const token = await issue();

			await reset.validate(token);
			await reset.validate(token);
			await expect(tokens.getUserByAccessToken(first.access)).resolves.toHaveProperty("id", user.id);
			await reset.change(token, "NewPassword123!", "NewPassword123!");

			for (const session of [first, second]) {
				await expect(tokens.getUserByAccessToken(session.access)).resolves.toBeNull();
				await expect(tokens.rotateRefreshToken(session.refresh)).resolves.toBeNull();
			}

			await expect(tokens.getUserByAccessToken(unrelated.access)).resolves.toHaveProperty("id", other.id);
			await expect(users.signIn(user.email, "NewPassword123!")).resolves.toHaveProperty("access");
			await expect(users.signIn(user.email, "OldPassword123!")).rejects.toMatchObject({ status: 401 });
			await expect(reset.validate(token)).rejects.toMatchObject({ status: 401 });

			const changed = await db.getRepository(UserEntity).findOne({
				where: { id: user.id },
				select: {
					passwordHash: true,
					authVersion: true,
					role: true,
				},
			});

			expect(await compare("NewPassword123!", changed.passwordHash)).toBe(true);
			expect(changed.authVersion).toBe(1);
			expect(changed.role).toBe(UserRole.ADMIN);
			expect(
				await db.getRepository(AuthEmailRequestEntity).countBy({ kind: AuthEmailRequestKind.PASSWORD_CHANGED }),
			).toBe(1);
		},
	);

	it("revokes other reset tokens and both old login and registration confirmation links", async () => {
		const loginUrl = new URL(await emails.createLink(user.id));
		const registrationUrl = new URL(await emails.createRegistrationLink(user.email, oldHash));
		const token = await issue();
		const another = await issue();

		await reset.change(token, "NewPassword123!", "NewPassword123!");
		await expect(reset.change(another, "AnotherPassword123!", "AnotherPassword123!")).rejects.toMatchObject({
			status: 401,
		});

		for (const oldUrl of [loginUrl, registrationUrl]) {
			await expect(emails.signIn(new URLSearchParams(oldUrl.hash.slice(1)).get("token"))).rejects.toMatchObject({
				status: 401,
			});
		}
	});

	it.each(["expired", "inactive", "email changed"])(
		"rejects %s links without changing credentials or sessions",
		async (condition) => {
			const session = await tokens.createSession(user.id);
			const token = await issue();

			if (condition === "expired") {
				await repository.update({ userId: user.id }, { expiresAt: new Date(Date.now() - 1000) });
			} else if (condition === "inactive") {
				await db.getRepository(UserEntity).update(user.id, { state: ModelState.INACTIVE });
			} else {
				await db.getRepository(UserEntity).update(user.id, { email: "changed@example.test" });
			}

			await expect(reset.validate(token)).rejects.toMatchObject({ status: 401 });
			await expect(reset.change(token, "NewPassword123!", "NewPassword123!")).rejects.toMatchObject({
				status: 401,
			});

			const unchanged = await db.getRepository(UserEntity).findOne({
				where: { id: user.id },
				select: {
					passwordHash: true,
					authVersion: true,
				},
			});

			expect(unchanged.passwordHash).toBe(oldHash);
			expect(unchanged.authVersion).toBe(0);
			expect(await db.getRepository(AuthEmailRequestEntity).count()).toBe(0);

			if (condition !== "inactive") {
				await expect(tokens.getUserByAccessToken(session.access)).resolves.toHaveProperty("id", user.id);
			}
		},
	);

	it("allows exactly one simultaneous reset even when two different tokens are submitted", async () => {
		const first = await issue();
		const second = await issue();

		const results = await Promise.allSettled([
			reset.change(first, "FirstPassword123!", "FirstPassword123!"),
			reset.change(second, "SecondPassword123!", "SecondPassword123!"),
		]);

		expect(results
			.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(await db.getRepository(AuthEmailRequestEntity).count()).toBe(1);
	});

	it("does not leave refresh or old-password login sessions alive after a concurrent reset", async () => {
		const session = await tokens.createSession(user.id);
		const token = await issue();

		const [refresh, signIn, change] = await Promise.allSettled([
			tokens.rotateRefreshToken(session.refresh),
			users.signIn(user.email, "OldPassword123!"),
			reset.change(token, "NewPassword123!", "NewPassword123!"),
		]);

		expect(change.status).toBe("fulfilled");

		for (const result of [refresh, signIn]) {
			if (result.status === "fulfilled" && result.value) {
				await expect(tokens.getUserByAccessToken(result.value.access)).resolves.toBeNull();
				await expect(tokens.rotateRefreshToken(result.value.refresh)).resolves.toBeNull();
			}
		}

		await expect(tokens.createSession(user.id, undefined, { passwordHash: oldHash })).resolves.toBeNull();
	});

	it("serializes old email link consumption against reset without deadlocks or surviving sessions", async () => {
		const oldUrl = new URL(await emails.createLink(user.id));
		const token = await issue();

		const [signIn, change] = await Promise.allSettled([
			emails.signIn(new URLSearchParams(oldUrl.hash.slice(1)).get("token")),
			reset.change(token, "NewPassword123!", "NewPassword123!"),
		]);

		expect(change.status).toBe("fulfilled");

		if (signIn.status === "fulfilled") {
			await expect(tokens.getUserByAccessToken(signIn.value.access)).resolves.toBeNull();
		}
	});

	it("rolls back credentials, token consumption and revocation if the transaction fails", async () => {
		const session = await tokens.createSession(user.id);
		const token = await issue();

		// Имитируем сбой последнего шага в отдельной тестовой БД для проверки атомарности всех предшествующих записей.
		await db.query(`CREATE FUNCTION fail_password_notification() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'test notification write failure'; END $$;
            CREATE TRIGGER fail_password_notification BEFORE INSERT ON users.auth_email_request_entity
            FOR EACH ROW EXECUTE FUNCTION fail_password_notification()`);

		try {
			await expect(reset.change(token, "NewPassword123!", "NewPassword123!")).rejects.toThrow(
				"test notification write failure",
			);
			await expect(reset.validate(token)).resolves.toBeUndefined();
			await expect(users.signIn(user.email, "OldPassword123!")).resolves.toHaveProperty("access");
			await expect(tokens.getUserByAccessToken(session.access)).resolves.toHaveProperty("id", user.id);
			expect((await repository.findOneBy({ userId: user.id })).usedAt).toBeNull();
		} finally {
			// Снимаем только тестовый триггер и функцию.
			await db.query(
				"DROP TRIGGER fail_password_notification ON users.auth_email_request_entity; DROP FUNCTION fail_password_notification()",
			);
		}
	});
});
