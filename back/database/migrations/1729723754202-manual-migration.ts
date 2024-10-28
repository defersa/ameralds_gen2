import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1729723754202 implements MigrationInterface {
    name = 'manualMigration1729723754202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image_entity" RENAME COLUMN "used" TO "using"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image_entity" RENAME COLUMN "using" TO "used"`);
    }

}
