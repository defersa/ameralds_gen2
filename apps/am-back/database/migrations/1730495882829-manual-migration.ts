import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1730495882829 implements MigrationInterface {
    name = 'manualMigration1730495882829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD "cbbId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "UQ_bc1357e32dff4ee41fba98c9303" UNIQUE ("cbbId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD "pdfId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "UQ_2e14bc5da48fd77612caa22ac30" UNIQUE ("pdfId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD "pngId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "UQ_561ea4cc8c1fa489ca9b8459292" UNIQUE ("pngId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD "jbbId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "UQ_2e4d474a1752cabcffba0650525" UNIQUE ("jbbId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "cbbFile" FOREIGN KEY ("cbbId") REFERENCES "file_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "pdfFile" FOREIGN KEY ("pdfId") REFERENCES "file_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "pngFile" FOREIGN KEY ("pngId") REFERENCES "file_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "jbbFile" FOREIGN KEY ("jbbId") REFERENCES "file_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "jbbFile"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "pngFile"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "pdfFile"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "cbbFile"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "UQ_2e4d474a1752cabcffba0650525"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP COLUMN "jbbId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "UQ_561ea4cc8c1fa489ca9b8459292"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP COLUMN "pngId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "UQ_2e14bc5da48fd77612caa22ac30"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP COLUMN "pdfId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "UQ_bc1357e32dff4ee41fba98c9303"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP COLUMN "cbbId"`);
    }

}
