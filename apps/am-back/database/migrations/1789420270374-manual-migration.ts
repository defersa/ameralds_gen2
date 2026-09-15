import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualMigration1789420270374 implements MigrationInterface {
    name = 'ManualMigration1789420270374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_2ee51f9463aad0789c1da55a194"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_bf67e3366d196b8f393a85ed5ab"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_2ee51f9463aad0789c1da55a194" FOREIGN KEY ("orderPatternEntityId") REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_bf67e3366d196b8f393a85ed5ab" FOREIGN KEY ("userPatternEntityId") REFERENCES "patterns"."user_pattern_entity"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_bf67e3366d196b8f393a85ed5ab"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_2ee51f9463aad0789c1da55a194"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_bf67e3366d196b8f393a85ed5ab" FOREIGN KEY ("userPatternEntityId") REFERENCES "patterns"."user_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_2ee51f9463aad0789c1da55a194" FOREIGN KEY ("orderPatternEntityId") REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
