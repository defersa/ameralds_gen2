import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1752019562670 implements MigrationInterface {
    name = 'manualMigration1752019562670'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "patterns"."order_pattern__pattern_size" ("order_pattern" integer NOT NULL, "pattern_size" integer NOT NULL, CONSTRAINT "PK_726184dee8dd70099c872573ad0" PRIMARY KEY ("order_pattern", "pattern_size"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f10a7af57197459140ceff2f7" ON "patterns"."order_pattern__pattern_size" ("order_pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_0a3272a28034ab5d196315b60d" ON "patterns"."order_pattern__pattern_size" ("pattern_size") `);
        await queryRunner.query(`CREATE TABLE "patterns"."user_pattern__pattern_size" ("user_pattern" integer NOT NULL, "pattern_size" integer NOT NULL, CONSTRAINT "PK_88634fb91fa0cee77a6a6508cef" PRIMARY KEY ("user_pattern", "pattern_size"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e43756cec3e26307c983b56208" ON "patterns"."user_pattern__pattern_size" ("user_pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_b86a0cb7a219208475b69496c0" ON "patterns"."user_pattern__pattern_size" ("pattern_size") `);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern__pattern_size" ADD CONSTRAINT "FK_1f10a7af57197459140ceff2f7a" FOREIGN KEY ("order_pattern") REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern__pattern_size" ADD CONSTRAINT "FK_0a3272a28034ab5d196315b60dd" FOREIGN KEY ("pattern_size") REFERENCES "patterns"."pattern_size_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern__pattern_size" ADD CONSTRAINT "FK_e43756cec3e26307c983b56208b" FOREIGN KEY ("user_pattern") REFERENCES "patterns"."user_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern__pattern_size" ADD CONSTRAINT "FK_b86a0cb7a219208475b69496c0c" FOREIGN KEY ("pattern_size") REFERENCES "patterns"."pattern_size_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern__pattern_size" DROP CONSTRAINT "FK_b86a0cb7a219208475b69496c0c"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern__pattern_size" DROP CONSTRAINT "FK_e43756cec3e26307c983b56208b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern__pattern_size" DROP CONSTRAINT "FK_0a3272a28034ab5d196315b60dd"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern__pattern_size" DROP CONSTRAINT "FK_1f10a7af57197459140ceff2f7a"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_b86a0cb7a219208475b69496c0"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_e43756cec3e26307c983b56208"`);
        await queryRunner.query(`DROP TABLE "patterns"."user_pattern__pattern_size"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_0a3272a28034ab5d196315b60d"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_1f10a7af57197459140ceff2f7"`);
        await queryRunner.query(`DROP TABLE "patterns"."order_pattern__pattern_size"`);
    }

}
