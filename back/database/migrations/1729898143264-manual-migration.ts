import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1729898143264 implements MigrationInterface {
    name = 'manualMigration1729898143264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_entity" ADD "using" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_entity" DROP COLUMN "using"`);
    }

}
