import type { MigrationInterface, QueryRunner } from 'typeorm';


export class ExternalRefunds1795000000000 implements MigrationInterface {
    public name = 'ExternalRefunds1795000000000';

    /** Добавляет происхождение возврата, план обнаружения внешних операций и неизменяемый журнал расхождений. */
    public async up(runner: QueryRunner): Promise<void> {
        // Существующие возвраты сохраняют администратора и помечаются как созданные приложением.
        await runner.query(`ALTER TABLE "users"."refund"
            ADD COLUMN "origin" varchar(20) NOT NULL DEFAULT 'application',
            ALTER COLUMN "initiated_by" DROP NOT NULL,
            ADD CONSTRAINT "chk_refund_origin" CHECK (
                (origin = 'application' AND initiated_by IS NOT NULL) OR
                (origin = 'provider' AND initiated_by IS NULL AND external_id IS NOT NULL AND status <> 'accepted'));
            ALTER TABLE "users"."user_payment_entity"
                ADD COLUMN "next_refund_check_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
            CREATE INDEX "idx_payment_refund_discovery" ON "users"."user_payment_entity" (next_refund_check_at, id)
                WHERE status = 'SUCCEEDED' AND external_id IS NOT NULL;
            CREATE TYPE "users"."refund_incident_state_enum" AS ENUM ('active', 'inactive');
            CREATE TABLE "users"."refund_incident" (
                id SERIAL PRIMARY KEY,
                state "users"."refund_incident_state_enum" NOT NULL DEFAULT 'active',
                "createdAt" timestamp NOT NULL DEFAULT now(),
                "updatedAt" timestamp NOT NULL DEFAULT now(),
                order_id integer NOT NULL REFERENCES "users"."user_order_entity"(id) ON DELETE RESTRICT,
                payment_id integer NOT NULL REFERENCES "users"."user_payment_entity"(id) ON DELETE RESTRICT,
                provider varchar(40) NOT NULL,
                external_id varchar(255) NOT NULL,
                kind varchar(40) NOT NULL,
                amount bigint NOT NULL,
                currency varchar(3) NOT NULL,
                provider_status varchar(20) NOT NULL,
                last_observed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_refund_incident_amount CHECK (amount > 0 AND amount <= 9007199254740991),
                CONSTRAINT chk_refund_incident_kind CHECK (kind IN ('partial_refund', 'unexpected_refund', 'conflicting_refund')),
                CONSTRAINT uq_refund_incident_external UNIQUE (provider, external_id)
            );
            CREATE INDEX idx_refund_incident_order ON "users"."refund_incident" (order_id)`);
    }

    /** Запрещает откат после появления внешнего финансового аудита; старые операции сохраняются. */
    public async down(runner: QueryRunner): Promise<void> {
        // Внешнего инициатора нельзя заменить вымышленным администратором ради отката схемы.
        await runner.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM "users"."refund" WHERE origin = 'provider') OR
                EXISTS (SELECT 1 FROM "users"."refund_incident") THEN
                RAISE EXCEPTION 'Cannot discard external refund audit';
            END IF;
            END $$`);
        // Удаляем только пустую дополнительную историю и возвращаем ограничения прежней схемы.
        await runner.query(`DROP TABLE "users"."refund_incident";
            DROP TYPE "users"."refund_incident_state_enum";
            DROP INDEX "users"."idx_payment_refund_discovery";
            ALTER TABLE "users"."user_payment_entity" DROP COLUMN next_refund_check_at;
            ALTER TABLE "users"."refund" DROP CONSTRAINT chk_refund_origin,
                DROP COLUMN origin, ALTER COLUMN initiated_by SET NOT NULL`);
    }
}
