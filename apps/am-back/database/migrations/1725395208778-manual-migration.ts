import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1725395208778 implements MigrationInterface {
    name = 'manualMigration1725395208778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_e9625c6754306ba78b558d9a0cc"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_170e89705efb6c9f90e1a7d1ba7"`);
        await queryRunner.query(`CREATE TYPE "patterns"."pattern_size_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "patterns"."pattern_size_entity" ("id" SERIAL NOT NULL, "state" "patterns"."pattern_size_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "sizeId" integer, "patternId" integer, CONSTRAINT "PK_a5e760e89664954c83cd42b19f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "sizeId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "patternId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "FK_cc427db7dd54f3f145f8bad97cb" FOREIGN KEY ("sizeId") REFERENCES "patterns"."size_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "FK_d4a78c5fb09552725d6b51b157a" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "FK_d4a78c5fb09552725d6b51b157a"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "FK_cc427db7dd54f3f145f8bad97cb"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "patternId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "sizeId" integer`);
        await queryRunner.query(`DROP TABLE "patterns"."pattern_size_entity"`);
        await queryRunner.query(`DROP TYPE "patterns"."pattern_size_entity_state_enum"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_170e89705efb6c9f90e1a7d1ba7" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_e9625c6754306ba78b558d9a0cc" FOREIGN KEY ("sizeId") REFERENCES "patterns"."size_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
