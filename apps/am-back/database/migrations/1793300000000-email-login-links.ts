import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailLoginLinks1793300000000 implements MigrationInterface {
    name = 'EmailLoginLinks1793300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "users"."email_login_link_entity_state_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "users"."email_login_link_entity" (
            "id" SERIAL NOT NULL,
            "state" "users"."email_login_link_entity_state_enum" NOT NULL DEFAULT 'active',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "tokenHash" character varying(64) NOT NULL,
            "expiredAt" TIMESTAMP NOT NULL,
            "redirectPath" character varying(2048) NOT NULL,
            "userId" integer NOT NULL,
            CONSTRAINT "PK_f7411d8212a6888d045f81b71ec" PRIMARY KEY ("id"),
            CONSTRAINT "FK_email_login_link_user" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        )`);
        await queryRunner.query('CREATE UNIQUE INDEX "IDX_email_login_link_hash" ON "users"."email_login_link_entity" ("tokenHash")');
        await queryRunner.query('CREATE INDEX "IDX_email_login_link_expiry" ON "users"."email_login_link_entity" ("expiredAt")');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "users"."email_login_link_entity"');
        await queryRunner.query('DROP TYPE "users"."email_login_link_entity_state_enum"');
    }
}
