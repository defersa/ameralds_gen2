import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameOrderPatternBought1786900000000 implements MigrationInterface {
    name = 'RenameOrderPatternBought1786900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" RENAME COLUMN "bought" TO "requiresPatternPurchase"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" RENAME COLUMN "requiresPatternPurchase" TO "bought"`);
    }
}
