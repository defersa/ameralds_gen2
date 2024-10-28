import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1729719793073 implements MigrationInterface {
    name = 'manualMigration1729719793073'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."category_entity" DROP CONSTRAINT "FK_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "image_entity" ADD "used" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "patterns"."category_entity" ADD CONSTRAINT "FK_5d7bdfc12192482b35397383b41" FOREIGN KEY ("labelId") REFERENCES "label_lang_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "patterns"."category_entity" DROP CONSTRAINT "FK_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`ALTER TABLE "image_entity" DROP COLUMN "used"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."category_entity" ADD CONSTRAINT "FK_5d7bdfc12192482b35397383b41" FOREIGN KEY ("labelId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
