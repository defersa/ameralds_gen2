import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1725394570138 implements MigrationInterface {
    name = 'manualMigration1725394570138'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "hidden"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "views"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "REL_f49227760501fc1eba6f4af19e"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "nameId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "REL_08d1b782bca2706897c3d3cfe9"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "descriptionId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "REL_b36bb4f3d60317a8f254128565"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "colorId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "sizeId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "patternId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "hidden" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "views" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "nameId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "UQ_f49227760501fc1eba6f4af19e0" UNIQUE ("nameId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "descriptionId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "UQ_08d1b782bca2706897c3d3cfe9b" UNIQUE ("descriptionId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "colorId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "UQ_b36bb4f3d60317a8f254128565e" UNIQUE ("colorId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_e9625c6754306ba78b558d9a0cc" FOREIGN KEY ("sizeId") REFERENCES "patterns"."size_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_170e89705efb6c9f90e1a7d1ba7" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_f49227760501fc1eba6f4af19e0" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_170e89705efb6c9f90e1a7d1ba7"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_e9625c6754306ba78b558d9a0cc"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "UQ_b36bb4f3d60317a8f254128565e"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "colorId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "UQ_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "descriptionId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "UQ_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "nameId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "views"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "hidden"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "patternId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "sizeId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "colorId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "REL_b36bb4f3d60317a8f254128565" UNIQUE ("colorId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "descriptionId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "REL_08d1b782bca2706897c3d3cfe9" UNIQUE ("descriptionId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "nameId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "REL_f49227760501fc1eba6f4af19e" UNIQUE ("nameId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "views" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "hidden" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_f49227760501fc1eba6f4af19e0" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
