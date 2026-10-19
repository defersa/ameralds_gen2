import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatternSizeParsed1792438279249 implements MigrationInterface {
    name = 'PatternSizeParsed1792438279249';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "jbbFile"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "UQ_2e4d474a1752cabcffba0650525"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP COLUMN "jbbId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD "parsed" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP COLUMN "parsed"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD "jbbId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "UQ_2e4d474a1752cabcffba0650525" UNIQUE ("jbbId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "jbbFile" FOREIGN KEY ("jbbId") REFERENCES "file_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }
}
