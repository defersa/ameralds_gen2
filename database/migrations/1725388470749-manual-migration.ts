import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1725388470749 implements MigrationInterface {
    name = 'manualMigration1725388470749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA "patterns"`);
        await queryRunner.query(`CREATE TYPE "patterns"."category_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "patterns"."category_entity" ("id" SERIAL NOT NULL, "state" "patterns"."category_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "labelId" integer, CONSTRAINT "REL_5d7bdfc12192482b35397383b4" UNIQUE ("labelId"), CONSTRAINT "PK_1a38b9007ed8afab85026703a53" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "patterns"."pattern_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "patterns"."pattern_entity" ("id" SERIAL NOT NULL, "state" "patterns"."pattern_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "hidden" boolean NOT NULL DEFAULT false, "views" integer NOT NULL DEFAULT '0', "nameId" integer, "descriptionId" integer, "colorId" integer, CONSTRAINT "REL_f49227760501fc1eba6f4af19e" UNIQUE ("nameId"), CONSTRAINT "REL_08d1b782bca2706897c3d3cfe9" UNIQUE ("descriptionId"), CONSTRAINT "REL_b36bb4f3d60317a8f254128565" UNIQUE ("colorId"), CONSTRAINT "PK_a8abc9a58d17573f9281518a84b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "patterns"."size_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "patterns"."size_entity" ("id" SERIAL NOT NULL, "state" "patterns"."size_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "value" integer NOT NULL, CONSTRAINT "PK_dae03c5911f6cd2799cb5ecdbd3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "patterns"."pattern_categories" ("pattern" integer NOT NULL, "category" integer NOT NULL, CONSTRAINT "PK_2e60d5a5b5fde5caa7d2e859e58" PRIMARY KEY ("pattern", "category"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a03ac3c17ad3d1a44db1360609" ON "patterns"."pattern_categories" ("pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_55dddf033639e8b435459fabd4" ON "patterns"."pattern_categories" ("category") `);
        await queryRunner.query(`CREATE TABLE "patterns"."pattern_images" ("pattern" integer NOT NULL, "image" integer NOT NULL, CONSTRAINT "PK_f517816ec3269a601ee521f4470" PRIMARY KEY ("pattern", "image"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5816ab90343f6715df58d06ce8" ON "patterns"."pattern_images" ("pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_ece730e5c053d00ae169c8d0d9" ON "patterns"."pattern_images" ("image") `);
        await queryRunner.query(`ALTER TABLE "patterns"."category_entity" ADD CONSTRAINT "FK_5d7bdfc12192482b35397383b41" FOREIGN KEY ("labelId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_f49227760501fc1eba6f4af19e0" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_categories" ADD CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f" FOREIGN KEY ("pattern") REFERENCES "patterns"."pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_categories" ADD CONSTRAINT "FK_55dddf033639e8b435459fabd49" FOREIGN KEY ("category") REFERENCES "patterns"."category_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_images" ADD CONSTRAINT "FK_5816ab90343f6715df58d06ce88" FOREIGN KEY ("pattern") REFERENCES "patterns"."pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_images" ADD CONSTRAINT "FK_ece730e5c053d00ae169c8d0d9c" FOREIGN KEY ("image") REFERENCES "image_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_images" DROP CONSTRAINT "FK_ece730e5c053d00ae169c8d0d9c"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_images" DROP CONSTRAINT "FK_5816ab90343f6715df58d06ce88"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_categories" DROP CONSTRAINT "FK_55dddf033639e8b435459fabd49"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_categories" DROP CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "patterns"."pattern_entity" DROP CONSTRAINT "FK_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "patterns"."category_entity" DROP CONSTRAINT "FK_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_ece730e5c053d00ae169c8d0d9"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_5816ab90343f6715df58d06ce8"`);
        await queryRunner.query(`DROP TABLE "patterns"."pattern_images"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_55dddf033639e8b435459fabd4"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_a03ac3c17ad3d1a44db1360609"`);
        await queryRunner.query(`DROP TABLE "patterns"."pattern_categories"`);
        await queryRunner.query(`DROP TABLE "patterns"."size_entity"`);
        await queryRunner.query(`DROP TYPE "patterns"."size_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "patterns"."pattern_entity"`);
        await queryRunner.query(`DROP TYPE "patterns"."pattern_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "patterns"."category_entity"`);
        await queryRunner.query(`DROP TYPE "patterns"."category_entity_state_enum"`);
        await queryRunner.query(`DROP SCHEMA "patterns"`);
    }

}
