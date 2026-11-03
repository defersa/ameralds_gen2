import { MigrationInterface, QueryRunner } from 'typeorm';

export class VersionedAppSettings1793500000000 implements MigrationInterface {
    name = 'VersionedAppSettings1793500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "app_setting_entity" (
            "version" integer NOT NULL,
            "snapshot" jsonb NOT NULL,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "createdById" integer,
            CONSTRAINT "PK_app_setting_version" PRIMARY KEY ("version"),
            CONSTRAINT "CHK_app_setting_version" CHECK ("version" > 0),
            CONSTRAINT "CHK_app_setting_snapshot" CHECK (jsonb_typeof("snapshot") = 'object'),
            CONSTRAINT "FK_app_setting_created_by" FOREIGN KEY ("createdById") REFERENCES "user_entity"("id") ON DELETE RESTRICT
        )`);
        await queryRunner.query(`CREATE FUNCTION "reject_app_setting_mutation"() RETURNS trigger AS $$
            BEGIN RAISE EXCEPTION 'AppSettings versions are immutable'; END;
        $$ LANGUAGE plpgsql`);
        await queryRunner.query(`CREATE TRIGGER "TR_app_setting_immutable" BEFORE UPDATE OR DELETE ON "app_setting_entity"
            FOR EACH ROW EXECUTE FUNCTION "reject_app_setting_mutation"()`);
        await queryRunner.query(`CREATE TRIGGER "TR_app_setting_no_truncate" BEFORE TRUNCATE ON "app_setting_entity"
            FOR EACH STATEMENT EXECUTE FUNCTION "reject_app_setting_mutation"()`);

        // Пересоздание enum допускает использование нового статуса в этой же транзакции миграции.
        await queryRunner.query('ALTER TYPE "users"."user_order_entity_status_enum" RENAME TO "user_order_entity_status_enum_old"');
        await queryRunner.query('CREATE TYPE "users"."user_order_entity_status_enum" AS ENUM (\'cancel\', \'open\', \'success\', \'pending_payment\')');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" TYPE "users"."user_order_entity_status_enum" USING "status"::text::"users"."user_order_entity_status_enum"');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" SET DEFAULT \'open\'');
        await queryRunner.query('DROP TYPE "users"."user_order_entity_status_enum_old"');
        await queryRunner.query(`ALTER TABLE "users"."user_order_entity"
            ADD "paymentExpiresAt" timestamptz,
            ADD "appSettingsVersion" integer,
            ADD "cancelledAt" timestamptz,
            ADD "cancelReason" varchar,
            ADD CONSTRAINT "FK_order_app_settings" FOREIGN KEY ("appSettingsVersion") REFERENCES "app_setting_entity"("version") ON DELETE RESTRICT,
            ADD CONSTRAINT "CHK_pending_order_payment_window" CHECK (
                "status" <> 'pending_payment' OR ("paymentExpiresAt" IS NOT NULL AND "appSettingsVersion" IS NOT NULL)
            )`);
        await queryRunner.query(`CREATE INDEX "IDX_order_payment_expiration" ON "users"."user_order_entity" ("paymentExpiresAt")
            WHERE "status" = 'pending_payment' AND "state" = 'active' AND "sourceAdminOrderId" IS NULL`);
        await queryRunner.query(`CREATE FUNCTION "users"."guard_order_payment_window"() RETURNS trigger AS $$
            BEGIN
                IF OLD."status" <> 'open' AND (
                    NEW."paymentExpiresAt" IS DISTINCT FROM OLD."paymentExpiresAt" OR
                    NEW."appSettingsVersion" IS DISTINCT FROM OLD."appSettingsVersion"
                ) THEN RAISE EXCEPTION 'Order payment window is immutable after checkout'; END IF;
                IF (OLD."status" = 'cancel' AND NEW."status" IN ('open', 'pending_payment', 'success')) OR
                    (OLD."status" = 'pending_payment' AND NEW."status" = 'open') THEN
                    RAISE EXCEPTION 'Cannot reopen a cancelled or pending order';
                END IF;
                RETURN NEW;
            END;
        $$ LANGUAGE plpgsql`);
        await queryRunner.query(`CREATE TRIGGER "TR_order_payment_window" BEFORE UPDATE ON "users"."user_order_entity"
            FOR EACH ROW EXECUTE FUNCTION "users"."guard_order_payment_window"()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TRIGGER "TR_order_payment_window" ON "users"."user_order_entity"');
        await queryRunner.query('DROP FUNCTION "users"."guard_order_payment_window"()');
        await queryRunner.query('DROP INDEX "users"."IDX_order_payment_expiration"');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "CHK_pending_order_payment_window"');
        // Pending не превращаем обратно в редактируемую корзину и не выдаём права при откате.
        await queryRunner.query('UPDATE "users"."user_order_entity" SET "status" = \'cancel\' WHERE "status" = \'pending_payment\'');
        await queryRunner.query('ALTER TYPE "users"."user_order_entity_status_enum" RENAME TO "user_order_entity_status_enum_old"');
        await queryRunner.query('CREATE TYPE "users"."user_order_entity_status_enum" AS ENUM (\'cancel\', \'open\', \'success\')');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" TYPE "users"."user_order_entity_status_enum" USING "status"::text::"users"."user_order_entity_status_enum"');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ALTER COLUMN "status" SET DEFAULT \'open\'');
        await queryRunner.query('DROP TYPE "users"."user_order_entity_status_enum_old"');
        await queryRunner.query(`ALTER TABLE "users"."user_order_entity"
            DROP CONSTRAINT "FK_order_app_settings", DROP COLUMN "paymentExpiresAt", DROP COLUMN "appSettingsVersion",
            DROP COLUMN "cancelledAt", DROP COLUMN "cancelReason"`);
        await queryRunner.query('DROP TABLE "app_setting_entity"');
        await queryRunner.query('DROP FUNCTION "reject_app_setting_mutation"()');
    }
}
