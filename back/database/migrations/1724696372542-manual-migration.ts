import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1724696372542 implements MigrationInterface {
    name = 'manualMigration1724696372542'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`CREATE TABLE "text_lang_entity" ("id" SERIAL NOT NULL, "ru" character varying(2047) NOT NULL, "en" character varying(2047) NOT NULL, CONSTRAINT "PK_c34e5b83d3aa0d76c49176fd915" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."file_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "file_entity" ("id" SERIAL NOT NULL, "state" "public"."file_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "path" character varying NOT NULL, CONSTRAINT "PK_d8375e0b2592310864d2b4974b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pattern_categories" ("pattern" integer NOT NULL, "category" integer NOT NULL, CONSTRAINT "PK_2e60d5a5b5fde5caa7d2e859e58" PRIMARY KEY ("pattern", "category"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a03ac3c17ad3d1a44db1360609" ON "pattern_categories" ("pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_55dddf033639e8b435459fabd4" ON "pattern_categories" ("category") `);
        await queryRunner.query(`CREATE TABLE "pattern_images" ("pattern" integer NOT NULL, "image" integer NOT NULL, CONSTRAINT "PK_f517816ec3269a601ee521f4470" PRIMARY KEY ("pattern", "image"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5816ab90343f6715df58d06ce8" ON "pattern_images" ("pattern") `);
        await queryRunner.query(`CREATE INDEX "IDX_ece730e5c053d00ae169c8d0d9" ON "pattern_images" ("image") `);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "REL_5d7bdfc12192482b35397383b4"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "labelId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "labelId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_5d7bdfc12192482b35397383b41" UNIQUE ("labelId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "hidden" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "views" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "nameId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_dcf867be95b80c1567d7e5e1d12" UNIQUE ("nameId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "descriptionId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_43345f94d43a0d84fa7126c9bda" UNIQUE ("descriptionId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "colorId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_033bad6f1f29e73dc3d5d9e0875" UNIQUE ("colorId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_5d7bdfc12192482b35397383b41" FOREIGN KEY ("labelId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_dcf867be95b80c1567d7e5e1d12" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_43345f94d43a0d84fa7126c9bda" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" ADD CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f" FOREIGN KEY ("pattern") REFERENCES "category_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" ADD CONSTRAINT "FK_55dddf033639e8b435459fabd49" FOREIGN KEY ("category") REFERENCES "category_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "pattern_images" ADD CONSTRAINT "FK_5816ab90343f6715df58d06ce88" FOREIGN KEY ("pattern") REFERENCES "category_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "pattern_images" ADD CONSTRAINT "FK_ece730e5c053d00ae169c8d0d9c" FOREIGN KEY ("image") REFERENCES "image_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pattern_images" DROP CONSTRAINT "FK_ece730e5c053d00ae169c8d0d9c"`);
        await queryRunner.query(`ALTER TABLE "pattern_images" DROP CONSTRAINT "FK_5816ab90343f6715df58d06ce88"`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" DROP CONSTRAINT "FK_55dddf033639e8b435459fabd49"`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" DROP CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_43345f94d43a0d84fa7126c9bda"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_dcf867be95b80c1567d7e5e1d12"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_033bad6f1f29e73dc3d5d9e0875"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "colorId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_43345f94d43a0d84fa7126c9bda"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "descriptionId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_dcf867be95b80c1567d7e5e1d12"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "nameId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "views"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "hidden"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_5d7bdfc12192482b35397383b41"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "labelId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "labelId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "REL_5d7bdfc12192482b35397383b4" UNIQUE ("labelId")`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ece730e5c053d00ae169c8d0d9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5816ab90343f6715df58d06ce8"`);
        await queryRunner.query(`DROP TABLE "pattern_images"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_55dddf033639e8b435459fabd4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a03ac3c17ad3d1a44db1360609"`);
        await queryRunner.query(`DROP TABLE "pattern_categories"`);
        await queryRunner.query(`DROP TABLE "file_entity"`);
        await queryRunner.query(`DROP TYPE "public"."file_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "text_lang_entity"`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_5d7bdfc12192482b35397383b41" FOREIGN KEY ("labelId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
