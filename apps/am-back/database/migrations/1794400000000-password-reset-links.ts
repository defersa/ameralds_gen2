import { MigrationInterface, QueryRunner } from "typeorm";


export class PasswordResetLinks1794400000000 implements MigrationInterface {
	public name = "PasswordResetLinks1794400000000";

	/** Добавляет одноразовые ссылки установки пароля и версии учётных данных без отзыва существующих сессий. */
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Версия 0 сохраняет работоспособность ранее выданных ссылок до первой смены пароля.
		await queryRunner.query('ALTER TABLE "user_entity" ADD "auth_version" integer NOT NULL DEFAULT 0');
		await queryRunner.query(
			'ALTER TABLE "users"."email_login_link_entity" ADD "auth_version" integer NOT NULL DEFAULT 0',
		);

		// Таблица хранит только хеш секрета и снимок владельца; привязка удаляется каскадно вместе с аккаунтом.
		await queryRunner.query(`CREATE TABLE "users"."password_reset_link" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "user_id" integer NOT NULL,
            "email" character varying(254) NOT NULL,
            "auth_version" integer NOT NULL,
            "token_hash" character varying(64) NOT NULL,
            "expires_at" TIMESTAMP NOT NULL,
            "used_at" TIMESTAMP,
            CONSTRAINT "pk_password_reset_link_id" PRIMARY KEY ("id"),
            CONSTRAINT "fk_password_reset_link_user_id" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE
        )`);
		// Уникальность защищает токен, остальные индексы ускоряют отзыв ссылок пользователя и очистку по сроку.
		await queryRunner.query(
			'CREATE UNIQUE INDEX "uq_password_reset_link_token_hash" ON "users"."password_reset_link" ("token_hash")',
		);
		await queryRunner.query(
			'CREATE INDEX "idx_password_reset_link_user_id" ON "users"."password_reset_link" ("user_id")',
		);
		await queryRunner.query(
			'CREATE INDEX "idx_password_reset_link_expires_at" ON "users"."password_reset_link" ("expires_at")',
		);

		// Расширяем существующую фоновую очередь письмами установки пароля и уведомлениями об успехе.
		await queryRunner.query(
			'ALTER TABLE "users"."auth_email_request_entity" DROP CONSTRAINT "CHK_auth_email_request_kind"',
		);
		await queryRunner.query(`ALTER TABLE "users"."auth_email_request_entity" ADD CONSTRAINT "CHK_auth_email_request_kind"
            CHECK ("kind" IN ('login', 'registration', 'password_reset', 'password_changed'))`);
	}

	/** Удаляет новую очередь заданий и ссылки; при откате отзывает почтовые ссылки, чтобы не восстановить их доступ. */
	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем несовместимые задания до восстановления прежнего ограничения видов писем.
		await queryRunner.query(
			`DELETE FROM "users"."auth_email_request_entity" WHERE "kind" IN ('password_reset', 'password_changed')`,
		);
		await queryRunner.query(
			'ALTER TABLE "users"."auth_email_request_entity" DROP CONSTRAINT "CHK_auth_email_request_kind"',
		);
		await queryRunner.query(
			`ALTER TABLE "users"."auth_email_request_entity" ADD CONSTRAINT "CHK_auth_email_request_kind" CHECK ("kind" IN ('login', 'registration'))`,
		);
		// Старая версия не проверяет auth_version; её откат не должен возродить отозванные ссылки входа.
		await queryRunner.query(`UPDATE "users"."email_login_link_entity" SET "state" = 'inactive'`);
		await queryRunner.query('DROP TABLE "users"."password_reset_link"');
		await queryRunner.query('ALTER TABLE "users"."email_login_link_entity" DROP COLUMN "auth_version"');
		await queryRunner.query('ALTER TABLE "user_entity" DROP COLUMN "auth_version"');
	}
}
