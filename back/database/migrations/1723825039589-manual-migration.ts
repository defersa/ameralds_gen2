import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1723825039589 implements MigrationInterface {
    name = 'manualMigration1723825039589'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "label_lang_entity" ("id" SERIAL NOT NULL, "ru" character varying(255) NOT NULL, "en" character varying(255) NOT NULL, CONSTRAINT "PK_95cb3760925274ebad3684b94ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."category_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "category_entity" ("id" SERIAL NOT NULL, "state" "public"."category_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "labelId" integer, CONSTRAINT "REL_5d7bdfc12192482b35397383b4" UNIQUE ("labelId"), CONSTRAINT "PK_1a38b9007ed8afab85026703a53" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "number_lang_entity" ("id" SERIAL NOT NULL, "ru" numeric NOT NULL, "en" numeric NOT NULL, CONSTRAINT "PK_2e3c87cb2af776213a2ecdc1a6e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."image_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "image_entity" ("id" SERIAL NOT NULL, "state" "public"."image_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "preview" character varying NOT NULL, "full" character varying NOT NULL, CONSTRAINT "PK_fb554818daabc01db00d67aafde" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."size_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "size_entity" ("id" SERIAL NOT NULL, "state" "public"."size_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "value" integer NOT NULL, CONSTRAINT "PK_dae03c5911f6cd2799cb5ecdbd3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_5d7bdfc12192482b35397383b41" FOREIGN KEY ("labelId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`DROP TABLE "size_entity"`);
        await queryRunner.query(`DROP TYPE "public"."size_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "image_entity"`);
        await queryRunner.query(`DROP TYPE "public"."image_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "number_lang_entity"`);
        await queryRunner.query(`DROP TABLE "category_entity"`);
        await queryRunner.query(`DROP TYPE "public"."category_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "label_lang_entity"`);
    }

}
