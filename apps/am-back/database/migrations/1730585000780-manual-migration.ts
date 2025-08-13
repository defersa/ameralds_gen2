import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1730585000780 implements MigrationInterface {
    name = 'manualMigration1730585000780'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "FK_cc427db7dd54f3f145f8bad97cb"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "FK_d4a78c5fb09552725d6b51b157a"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "basePriceId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "UQ_f094ff430ae2da4b1755e6e3c1a" UNIQUE ("basePriceId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "additionalPriceId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "UQ_a974a5eba0fca5d127dd6ce1cbc" UNIQUE ("additionalPriceId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD "colorPriceId" integer`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "UQ_3c4c048470a35854229be6c6c20" UNIQUE ("colorPriceId")`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_f094ff430ae2da4b1755e6e3c1a" FOREIGN KEY ("basePriceId") REFERENCES "number_lang_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_a974a5eba0fca5d127dd6ce1cbc" FOREIGN KEY ("additionalPriceId") REFERENCES "number_lang_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_3c4c048470a35854229be6c6c20" FOREIGN KEY ("colorPriceId") REFERENCES "number_lang_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "FK_cc427db7dd54f3f145f8bad97cb" FOREIGN KEY ("sizeId") REFERENCES "patterns"."size_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "FK_d4a78c5fb09552725d6b51b157a" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "FK_d4a78c5fb09552725d6b51b157a"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" DROP CONSTRAINT "FK_cc427db7dd54f3f145f8bad97cb"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_3c4c048470a35854229be6c6c20"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_a974a5eba0fca5d127dd6ce1cbc"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_f094ff430ae2da4b1755e6e3c1a"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "UQ_3c4c048470a35854229be6c6c20"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "colorPriceId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "UQ_a974a5eba0fca5d127dd6ce1cbc"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "additionalPriceId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "UQ_f094ff430ae2da4b1755e6e3c1a"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP COLUMN "basePriceId"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "FK_d4a78c5fb09552725d6b51b157a" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_size_entity" ADD CONSTRAINT "FK_cc427db7dd54f3f145f8bad97cb" FOREIGN KEY ("sizeId") REFERENCES "patterns"."size_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
