import { MigrationInterface, QueryRunner } from "typeorm";

export class manualMigration1731147366581 implements MigrationInterface {
    name = 'manualMigration1731147366581'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "patterns"."order_pattern_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "patterns"."order_pattern_entity" ("id" SERIAL NOT NULL, "state" "patterns"."order_pattern_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "color" boolean NOT NULL DEFAULT false, "patternId" integer, CONSTRAINT "PK_f72eada3fba0c3e53934cfe0f73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "patterns"."user_pattern_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "patterns"."user_pattern_entity" ("id" SERIAL NOT NULL, "state" "patterns"."user_pattern_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "color" boolean NOT NULL DEFAULT false, "patternId" integer, "userId" integer, CONSTRAINT "PK_bac0468ef6e7bc927bd8d3d9378" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" ("orderPatternEntityId" integer NOT NULL, "patternSizeEntityId" integer NOT NULL, CONSTRAINT "PK_48757881d1743fa74835f1f9de3" PRIMARY KEY ("orderPatternEntityId", "patternSizeEntityId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2ee51f9463aad0789c1da55a19" ON "patterns"."order_pattern_entity_sizes_pattern_size_entity" ("orderPatternEntityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3816686b204230920ac650d1e7" ON "patterns"."order_pattern_entity_sizes_pattern_size_entity" ("patternSizeEntityId") `);
        await queryRunner.query(`CREATE TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" ("userPatternEntityId" integer NOT NULL, "patternSizeEntityId" integer NOT NULL, CONSTRAINT "PK_5ba42cfc62931e95a34cfef6007" PRIMARY KEY ("userPatternEntityId", "patternSizeEntityId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bf67e3366d196b8f393a85ed5a" ON "patterns"."user_pattern_entity_sizes_pattern_size_entity" ("userPatternEntityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9daef54a6fcaede020ffc7fe5a" ON "patterns"."user_pattern_entity_sizes_pattern_size_entity" ("patternSizeEntityId") `);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" ADD CONSTRAINT "FK_13306b2341dff1a53f3c1e8070a" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity" ADD CONSTRAINT "FK_c5b375087327288b2106abcee0e" FOREIGN KEY ("patternId") REFERENCES "patterns"."pattern_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity" ADD CONSTRAINT "FK_ac5f8a8416834e61716674424ae" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_2ee51f9463aad0789c1da55a194" FOREIGN KEY ("orderPatternEntityId") REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_3816686b204230920ac650d1e7e" FOREIGN KEY ("patternSizeEntityId") REFERENCES "patterns"."pattern_size_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_bf67e3366d196b8f393a85ed5ab" FOREIGN KEY ("userPatternEntityId") REFERENCES "patterns"."user_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" ADD CONSTRAINT "FK_9daef54a6fcaede020ffc7fe5aa" FOREIGN KEY ("patternSizeEntityId") REFERENCES "patterns"."pattern_size_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_9daef54a6fcaede020ffc7fe5aa"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_bf67e3366d196b8f393a85ed5ab"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_3816686b204230920ac650d1e7e"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_2ee51f9463aad0789c1da55a194"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity" DROP CONSTRAINT "FK_ac5f8a8416834e61716674424ae"`);
        await queryRunner.query(`ALTER TABLE "patterns"."user_pattern_entity" DROP CONSTRAINT "FK_c5b375087327288b2106abcee0e"`);
        await queryRunner.query(`ALTER TABLE "patterns"."order_pattern_entity" DROP CONSTRAINT "FK_13306b2341dff1a53f3c1e8070a"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_9daef54a6fcaede020ffc7fe5a"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_bf67e3366d196b8f393a85ed5a"`);
        await queryRunner.query(`DROP TABLE "patterns"."user_pattern_entity_sizes_pattern_size_entity"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_3816686b204230920ac650d1e7"`);
        await queryRunner.query(`DROP INDEX "patterns"."IDX_2ee51f9463aad0789c1da55a19"`);
        await queryRunner.query(`DROP TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity"`);
        await queryRunner.query(`DROP TABLE "patterns"."user_pattern_entity"`);
        await queryRunner.query(`DROP TYPE "patterns"."user_pattern_entity_state_enum"`);
        await queryRunner.query(`DROP TABLE "patterns"."order_pattern_entity"`);
        await queryRunner.query(`DROP TYPE "patterns"."order_pattern_entity_state_enum"`);
    }

}
