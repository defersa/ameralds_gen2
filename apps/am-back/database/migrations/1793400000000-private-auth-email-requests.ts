import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrivateAuthEmailRequests1793400000000 implements MigrationInterface {
    name = 'PrivateAuthEmailRequests1793400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users"."auth_email_request_entity" (
            "id" SERIAL NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "kind" character varying(16) NOT NULL,
            "email" character varying(254) NOT NULL,
            "passwordHash" character varying(60),
            "redirectPath" character varying(2048) NOT NULL,
            "attempts" integer NOT NULL DEFAULT 0,
            "availableAt" TIMESTAMP NOT NULL,
            "leaseToken" character varying(36),
            CONSTRAINT "PK_auth_email_request" PRIMARY KEY ("id"),
            CONSTRAINT "CHK_auth_email_request_kind" CHECK ("kind" IN ('login', 'registration'))
        )`);
        await queryRunner.query('CREATE INDEX "IDX_auth_email_request_ready" ON "users"."auth_email_request_entity" ("availableAt", "id")');
        await queryRunner.query(`CREATE TABLE "users"."auth_email_limit_entity" (
            "key" character varying(64) NOT NULL,
            "count" integer NOT NULL,
            "resetAt" TIMESTAMP NOT NULL,
            CONSTRAINT "PK_auth_email_limit" PRIMARY KEY ("key")
        )`);
        await queryRunner.query('CREATE INDEX "IDX_auth_email_limit_reset" ON "users"."auth_email_limit_entity" ("resetAt")');
        await queryRunner.query('ALTER TABLE "users"."email_login_link_entity" ALTER COLUMN "userId" DROP NOT NULL');
        await queryRunner.query('ALTER TABLE "users"."email_login_link_entity" ADD "registrationEmail" character varying(254), ADD "registrationPasswordHash" character varying(60)');
        await queryRunner.query(`ALTER TABLE "users"."email_login_link_entity" ADD CONSTRAINT "CHK_email_login_link_subject" CHECK (
            ("userId" IS NOT NULL AND "registrationEmail" IS NULL AND "registrationPasswordHash" IS NULL)
            OR ("userId" IS NULL AND "registrationEmail" IS NOT NULL AND "registrationPasswordHash" IS NOT NULL)
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Неподтверждённые регистрации не имеют пользователя и несовместимы с прежней схемой.
        await queryRunner.query('DELETE FROM "users"."email_login_link_entity" WHERE "userId" IS NULL');
        await queryRunner.query('ALTER TABLE "users"."email_login_link_entity" DROP CONSTRAINT "CHK_email_login_link_subject"');
        await queryRunner.query('ALTER TABLE "users"."email_login_link_entity" DROP COLUMN "registrationPasswordHash", DROP COLUMN "registrationEmail"');
        await queryRunner.query('ALTER TABLE "users"."email_login_link_entity" ALTER COLUMN "userId" SET NOT NULL');
        await queryRunner.query('DROP TABLE "users"."auth_email_limit_entity"');
        await queryRunner.query('DROP TABLE "users"."auth_email_request_entity"');
    }
}
