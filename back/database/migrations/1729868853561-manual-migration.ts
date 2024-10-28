import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1729868853561 implements MigrationInterface {
    name = 'manualMigration1729868853561'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image_entity" ADD "index" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image_entity" DROP COLUMN "index"`);
    }

}
