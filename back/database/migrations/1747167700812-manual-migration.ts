import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1747167700812 implements MigrationInterface {
    name = 'manualMigration1747167700812'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" ADD "bought" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" DROP COLUMN "bought"`);
    }

}
