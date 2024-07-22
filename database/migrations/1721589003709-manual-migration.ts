import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1721589003709 implements MigrationInterface {
    name = 'manualMigration1721589003709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "token_entity" DROP COLUMN "value"`);
        await queryRunner.query(`ALTER TABLE "token_entity" ADD "value" character varying(300) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "token_entity" DROP COLUMN "value"`);
        await queryRunner.query(`ALTER TABLE "token_entity" ADD "value" character varying(150) NOT NULL`);
    }

}
