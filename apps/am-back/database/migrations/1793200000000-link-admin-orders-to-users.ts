import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkAdminOrdersToUsers1793200000000 implements MigrationInterface {
    name = 'LinkAdminOrdersToUsers1793200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user_entity" ALTER COLUMN "passwordHash" DROP NOT NULL');
        await queryRunner.query('CREATE UNIQUE INDEX "IDX_user_email_case_insensitive" ON "user_entity" (LOWER("email"))');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ADD "sourceAdminOrderId" integer');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ADD CONSTRAINT "REL_5c22f7bea4a34091d1bb405c95" UNIQUE ("sourceAdminOrderId")');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" ADD CONSTRAINT "FK_user_order_source_admin_order" FOREIGN KEY ("sourceAdminOrderId") REFERENCES "users"."admin_order_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "FK_user_order_source_admin_order"');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "REL_5c22f7bea4a34091d1bb405c95"');
        await queryRunner.query('ALTER TABLE "users"."user_order_entity" DROP COLUMN "sourceAdminOrderId"');
        await queryRunner.query('DROP INDEX "IDX_user_email_case_insensitive"');
        // При откате сохраняем аккаунты без пароля с заведомо недействительным bcrypt-хешем.
        await queryRunner.query('UPDATE "user_entity" SET "passwordHash" = \'!\' WHERE "passwordHash" IS NULL');
        await queryRunner.query('ALTER TABLE "user_entity" ALTER COLUMN "passwordHash" SET NOT NULL');
    }
}
