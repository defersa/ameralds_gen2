import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1752019464740 implements MigrationInterface {
    name = 'manualMigration1752019464740'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "patterns"."order-pattern_pattern-size" ("order-pattern" integer NOT NULL, "pattern-size" integer NOT NULL, CONSTRAINT "PK_f5a40b72bb2cd8099b3d8ffd611" PRIMARY KEY ("order-pattern", "pattern-size"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f16449e4776bfe77112cfe1221" ON "patterns"."order-pattern_pattern-size" ("order-pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_463a8c9d90a303b165945d16f8" ON "patterns"."order-pattern_pattern-size" ("pattern-size") `);
        await queryRunner.query(`CREATE TABLE "patterns"."user-pattern_pattern-size" ("user-pattern" integer NOT NULL, "pattern-size" integer NOT NULL, CONSTRAINT "PK_127dabcbaadbb0c1b02e51ea0ab" PRIMARY KEY ("user-pattern", "pattern-size"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ded85ecc33580a7ca2bcc30fdb" ON "patterns"."user-pattern_pattern-size" ("user-pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_818cc55cc71c4efe91f8c87802" ON "patterns"."user-pattern_pattern-size" ("pattern-size") `);
        await queryRunner.query(`ALTER TABLE "patterns"."order-pattern_pattern-size" ADD CONSTRAINT "FK_f16449e4776bfe77112cfe1221c" FOREIGN KEY ("order-pattern") REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."order-pattern_pattern-size" ADD CONSTRAINT "FK_463a8c9d90a303b165945d16f89" FOREIGN KEY ("pattern-size") REFERENCES "patterns"."pattern_size_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user-pattern_pattern-size" ADD CONSTRAINT "FK_ded85ecc33580a7ca2bcc30fdbf" FOREIGN KEY ("user-pattern") REFERENCES "patterns"."user_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user-pattern_pattern-size" ADD CONSTRAINT "FK_818cc55cc71c4efe91f8c87802d" FOREIGN KEY ("pattern-size") REFERENCES "patterns"."pattern_size_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."user-pattern_pattern-size" DROP CONSTRAINT "FK_818cc55cc71c4efe91f8c87802d"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user-pattern_pattern-size" DROP CONSTRAINT "FK_ded85ecc33580a7ca2bcc30fdbf"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order-pattern_pattern-size" DROP CONSTRAINT "FK_463a8c9d90a303b165945d16f89"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order-pattern_pattern-size" DROP CONSTRAINT "FK_f16449e4776bfe77112cfe1221c"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_818cc55cc71c4efe91f8c87802"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_ded85ecc33580a7ca2bcc30fdb"`);
        await queryRunner.query(`DROP TABLE "patterns"."user-pattern_pattern-size"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_463a8c9d90a303b165945d16f8"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_f16449e4776bfe77112cfe1221"`);
        await queryRunner.query(`DROP TABLE "patterns"."order-pattern_pattern-size"`);
    }

}
