import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1731168099008 implements MigrationInterface {
    name = 'manualMigration1731168099008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "users"."user_payment_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "users"."user_payment_entity" ("id" SERIAL NOT NULL, "state" "users"."user_payment_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "totalPriceId" integer, CONSTRAINT "REL_9eef92f918ae3c0b167d8544e9" UNIQUE ("totalPriceId"), CONSTRAINT "PK_0bc0bc5f15359ddbb695d115edc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "users"."admin_order_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "users"."admin_order_entity" ("id" SERIAL NOT NULL, "state" "users"."admin_order_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, CONSTRAINT "PK_8e2db463599d63cd1bac40c9cd9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "users"."user_order_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TYPE "users"."user_order_entity_status_enum" AS ENUM('cancel', 'open', 'success')`);
        await queryRunner.query(`CREATE TABLE "users"."user_order_entity" ("id" SERIAL NOT NULL, "state" "users"."user_order_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" "users"."user_order_entity_status_enum" NOT NULL DEFAULT 'open', "userId" integer, "paymentId" integer, CONSTRAINT "REL_72cf41a6838b2f2d51b2f79b8c" UNIQUE ("paymentId"), CONSTRAINT "PK_e07457e91b49b492fdc2b9a9cba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" ADD "orderId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" ADD "adminOrderId" integer`);
        await queryRunner.query(`ALTER TABLE "users"."user_payment_entity" ADD CONSTRAINT "FK_9eef92f918ae3c0b167d8544e9e" FOREIGN KEY ("totalPriceId") REFERENCES "number_lang_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."user_order_entity" ADD CONSTRAINT "FK_47a0f5c1be54e500cefe5cab076" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."user_order_entity" ADD CONSTRAINT "FK_72cf41a6838b2f2d51b2f79b8ca" FOREIGN KEY ("paymentId") REFERENCES "users"."user_payment_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" ADD CONSTRAINT "FK_7ddbc02f38160de4fb3a4b932db" FOREIGN KEY ("orderId") REFERENCES "users"."user_order_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" ADD CONSTRAINT "FK_8f51aa71a088a6d2aca5c2387d4" FOREIGN KEY ("adminOrderId") REFERENCES "users"."admin_order_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" DROP CONSTRAINT "FK_8f51aa71a088a6d2aca5c2387d4"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" DROP CONSTRAINT "FK_7ddbc02f38160de4fb3a4b932db"`);
        await queryRunner.query(`ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "FK_72cf41a6838b2f2d51b2f79b8ca"`);
        await queryRunner.query(`ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "FK_47a0f5c1be54e500cefe5cab076"`);
        await queryRunner.query(`ALTER TABLE "users"."user_payment_entity" DROP CONSTRAINT "FK_9eef92f918ae3c0b167d8544e9e"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" DROP COLUMN "adminOrderId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" DROP COLUMN "orderId"`);
        await queryRunner.query(`DROP TABLE "users"."user_order_entity"`);
        await queryRunner.query(`DROP TYPE "users"."user_order_entity_status_enum"`);
        await queryRunner.query(`DROP TYPE "users"."user_order_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "users"."admin_order_entity"`);
        await queryRunner.query(`DROP TYPE "users"."admin_order_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "users"."user_payment_entity"`);
        await queryRunner.query(`DROP TYPE "users"."user_payment_entity_state_enum"`);
    }

}
