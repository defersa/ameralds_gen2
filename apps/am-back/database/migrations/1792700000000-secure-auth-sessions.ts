import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureAuthSessions1792700000000 implements MigrationInterface {
    name = 'SecureAuthSessions1792700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "token_entity" ADD "sessionId" uuid');
        // Старые токены с несовместимыми сроками действия больше не принимаются.
        await queryRunner.query('UPDATE "token_entity" SET "state" = \'inactive\', "value" = \'revoked:\' || "id"::text');
        await queryRunner.query('CREATE UNIQUE INDEX "IDX_token_value" ON "token_entity" ("value")');
        await queryRunner.query('CREATE INDEX "IDX_token_session" ON "token_entity" ("sessionId")');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "IDX_token_session"');
        await queryRunner.query('DROP INDEX "IDX_token_value"');
        await queryRunner.query('ALTER TABLE "token_entity" DROP COLUMN "sessionId"');
    }
}
