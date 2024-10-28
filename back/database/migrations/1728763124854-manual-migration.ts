import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1728763124854 implements MigrationInterface {
    name = 'manualMigration1728763124854'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_entity" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."file_entity_type_enum" AS ENUM('public', 'private')`);
        await queryRunner.query(`ALTER TABLE "file_entity" ADD "type" "public"."file_entity_type_enum" NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_1b03750121cb502cb51124d880" ON "file_entity" ("type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1b03750121cb502cb51124d880"`);
        await queryRunner.query(`ALTER TABLE "file_entity" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."file_entity_type_enum"`);
        await queryRunner.query(`ALTER TABLE "file_entity" DROP COLUMN "name"`);
    }

}
