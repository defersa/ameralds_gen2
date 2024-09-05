import { MigrationInterface, QueryRunner } from "typeorm";


export class ManualMigration1721245814512 implements MigrationInterface {
    name = 'ManualMigration1721245814512'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."token_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TYPE "public"."token_entity_type_enum" AS ENUM('access', 'refresh', 'verify')`);
        await queryRunner.query(`CREATE TABLE "token_entity" ("id" SERIAL NOT NULL, "state" "public"."token_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "expiredAt" TIMESTAMP NOT NULL, "value" character varying(150) NOT NULL, "type" "public"."token_entity_type_enum" NOT NULL, "userId" integer, CONSTRAINT "PK_687443f2a51af49b5472e2c5ddc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_723efdc1e6ed4340d8c3d1370e" ON "token_entity" ("type") `);
        await queryRunner.query(`CREATE TYPE "public"."user_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TYPE "public"."user_entity_status_enum" AS ENUM('registered', 'verified')`);
        await queryRunner.query(`CREATE TYPE "public"."user_entity_role_enum" AS ENUM('common', 'admin')`);
        await queryRunner.query(`CREATE TABLE "user_entity" ("id" SERIAL NOT NULL, "state" "public"."user_entity_state_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "username" character varying, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "status" "public"."user_entity_status_enum" NOT NULL DEFAULT 'registered', "role" "public"."user_entity_role_enum" NOT NULL DEFAULT 'common', CONSTRAINT "UQ_415c35b9b3b6fe45a3b065030f5" UNIQUE ("email"), CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "token_entity" ADD CONSTRAINT "FK_de044c3492e70d6d9511ee35792" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "token_entity" DROP CONSTRAINT "FK_de044c3492e70d6d9511ee35792"`);
        await queryRunner.query(`DROP TABLE "user_entity"`);
        await queryRunner.query(`DROP TYPE "public"."user_entity_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_entity_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_entity_state_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_723efdc1e6ed4340d8c3d1370e"`);
        await queryRunner.query(`DROP TABLE "token_entity"`);
        await queryRunner.query(`DROP TYPE "public"."token_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."token_entity_state_enum"`);
    }

}
