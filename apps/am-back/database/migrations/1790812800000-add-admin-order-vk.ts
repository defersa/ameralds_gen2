import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminOrderVk1790812800000 implements MigrationInterface {
    name = 'AddAdminOrderVk1790812800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."admin_order_entity" ADD "vk" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."admin_order_entity" DROP COLUMN "vk"`);
    }
}
