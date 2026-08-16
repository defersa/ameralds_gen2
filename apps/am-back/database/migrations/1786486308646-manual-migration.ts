import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualMigration1786486308646 implements MigrationInterface {
    name = 'ManualMigration1786486308646'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."admin_order_entity" ADD "isComplete" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users"."admin_order_entity" ALTER COLUMN "isComplete" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "label_lang_entity" ALTER COLUMN "en" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "text_lang_entity" ALTER COLUMN "en" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "file_entity" ALTER COLUMN "path" TYPE character varying(400)`);
        await queryRunner.query(`ALTER TABLE "file_entity" ALTER COLUMN "name" TYPE character varying(200)`);
        await queryRunner.query(`ALTER TABLE "image_entity" ALTER COLUMN "name" TYPE character varying(200)`);
        await queryRunner.query(`ALTER TABLE "image_entity" ALTER COLUMN "preview" TYPE character varying(200)`);
        await queryRunner.query(`ALTER TABLE "image_entity" ALTER COLUMN "full" TYPE character varying(200)`);
        await queryRunner.query(`ALTER TABLE "number_lang_entity" ALTER COLUMN "en" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "number_lang_entity" ALTER COLUMN "en" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "image_entity" ALTER COLUMN "full" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "image_entity" ALTER COLUMN "preview" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "image_entity" ALTER COLUMN "name" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "file_entity" ALTER COLUMN "name" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "file_entity" ALTER COLUMN "path" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "text_lang_entity" ALTER COLUMN "en" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "label_lang_entity" ALTER COLUMN "en" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users"."admin_order_entity" DROP COLUMN "isComplete"`);
    }

}
