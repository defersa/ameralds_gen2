import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1729700935582 implements MigrationInterface {
    name = 'manualMigration1729700935582'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_f49227760501fc1eba6f4af19e0" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_f49227760501fc1eba6f4af19e0" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
