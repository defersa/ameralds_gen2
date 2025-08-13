import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1724696524554 implements MigrationInterface {
    name = 'manualMigration1724696524554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_dcf867be95b80c1567d7e5e1d12"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "FK_43345f94d43a0d84fa7126c9bda"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" DROP CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f"`);
        await queryRunner.query(`ALTER TABLE "pattern_images" DROP CONSTRAINT "FK_5816ab90343f6715df58d06ce88"`);
        await queryRunner.query(`CREATE TYPE "public"."pattern_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "pattern_entity" ("id" SERIAL NOT NULL, "state" "public"."pattern_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "hidden" boolean NOT NULL DEFAULT false, "views" integer NOT NULL DEFAULT '0', "nameId" integer, "descriptionId" integer, "colorId" integer, CONSTRAINT "REL_f49227760501fc1eba6f4af19e" UNIQUE ("nameId"), CONSTRAINT "REL_08d1b782bca2706897c3d3cfe9" UNIQUE ("descriptionId"), CONSTRAINT "REL_b36bb4f3d60317a8f254128565" UNIQUE ("colorId"), CONSTRAINT "PK_a8abc9a58d17573f9281518a84b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "hidden"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "views"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_dcf867be95b80c1567d7e5e1d12"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "nameId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_43345f94d43a0d84fa7126c9bda"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "descriptionId"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP CONSTRAINT "UQ_033bad6f1f29e73dc3d5d9e0875"`);
        await queryRunner.query(`ALTER TABLE "category_entity" DROP COLUMN "colorId"`);
        await queryRunner.query(`ALTER TABLE "pattern_entity" ADD CONSTRAINT "FK_f49227760501fc1eba6f4af19e0" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pattern_entity" ADD CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pattern_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" ADD CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f" FOREIGN KEY ("pattern") REFERENCES "pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "pattern_images" ADD CONSTRAINT "FK_5816ab90343f6715df58d06ce88" FOREIGN KEY ("pattern") REFERENCES "pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pattern_images" DROP CONSTRAINT "FK_5816ab90343f6715df58d06ce88"`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" DROP CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f"`);
        await queryRunner.query(`ALTER TABLE "pattern_entity" DROP CONSTRAINT "patternColor"`);
        await queryRunner.query(`ALTER TABLE "pattern_entity" DROP CONSTRAINT "FK_08d1b782bca2706897c3d3cfe9b"`);
        await queryRunner.query(`ALTER TABLE "pattern_entity" DROP CONSTRAINT "FK_f49227760501fc1eba6f4af19e0"`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "colorId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_033bad6f1f29e73dc3d5d9e0875" UNIQUE ("colorId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "descriptionId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_43345f94d43a0d84fa7126c9bda" UNIQUE ("descriptionId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "nameId" integer`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "UQ_dcf867be95b80c1567d7e5e1d12" UNIQUE ("nameId")`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "views" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD "hidden" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP TABLE "pattern_entity"`);
        await queryRunner.query(`DROP TYPE "public"."pattern_entity_state_enum"`);
        await queryRunner.query(`ALTER TABLE "pattern_images" ADD CONSTRAINT "FK_5816ab90343f6715df58d06ce88" FOREIGN KEY ("pattern") REFERENCES "category_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "pattern_categories" ADD CONSTRAINT "FK_a03ac3c17ad3d1a44db1360609f" FOREIGN KEY ("pattern") REFERENCES "category_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "patternColor" FOREIGN KEY ("colorId") REFERENCES "file_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_43345f94d43a0d84fa7126c9bda" FOREIGN KEY ("descriptionId") REFERENCES "text_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category_entity" ADD CONSTRAINT "FK_dcf867be95b80c1567d7e5e1d12" FOREIGN KEY ("nameId") REFERENCES "label_lang_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
