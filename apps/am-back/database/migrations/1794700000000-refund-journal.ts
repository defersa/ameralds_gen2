import type { MigrationInterface, QueryRunner } from 'typeorm';


export class RefundJournal1794700000000 implements MigrationInterface {
    public name = 'RefundJournal1794700000000';

    /** Создаёт отдельный финансовый журнал и запрещает одновременные активные возвраты одного заказа. */
    public async up(runner: QueryRunner): Promise<void> {
        // Сохраняем исходный платёж, автора, сумму и историю; FK защищают финансовый аудит от удаления.
        await runner.query(`CREATE TYPE "users"."refund_state_enum" AS ENUM ('active', 'inactive');
            CREATE TABLE "users"."refund" (
                "id" SERIAL PRIMARY KEY,
                "state" "users"."refund_state_enum" NOT NULL DEFAULT 'active',
                "createdAt" timestamp NOT NULL DEFAULT now(),
                "updatedAt" timestamp NOT NULL DEFAULT now(),
                "order_id" integer NOT NULL REFERENCES "users"."user_order_entity"("id") ON DELETE RESTRICT,
                "payment_id" integer NOT NULL REFERENCES "users"."user_payment_entity"("id") ON DELETE RESTRICT,
                "initiated_by" integer NOT NULL REFERENCES "user_entity"("id") ON DELETE RESTRICT,
                "reason" text NOT NULL,
                "amount" bigint NOT NULL,
                "currency" varchar(3) NOT NULL,
                "provider" varchar(40) NOT NULL,
                "external_id" varchar(255),
                "idempotency_key" uuid NOT NULL,
                "status" varchar(20) NOT NULL,
                "transitions" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "error_code" varchar(80),
                "next_check_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "check_failures" integer NOT NULL DEFAULT 0,
                "completed_at" timestamptz,
                CONSTRAINT "chk_refund_amount" CHECK ("amount" > 0 AND "amount" <= 9007199254740991),
                CONSTRAINT "chk_refund_currency" CHECK ("currency" IN ('RUB', 'USD')),
                CONSTRAINT "chk_refund_status" CHECK ("status" IN ('accepted', 'processing', 'unknown', 'succeeded', 'failed')),
                CONSTRAINT "chk_refund_reason" CHECK (length(trim("reason")) > 0),
                CONSTRAINT "chk_refund_failures" CHECK ("check_failures" >= 0),
                CONSTRAINT "chk_refund_transitions" CHECK (jsonb_typeof("transitions") = 'array')
            );
            CREATE UNIQUE INDEX "uq_refund_idempotency" ON "users"."refund" ("idempotency_key");
            CREATE UNIQUE INDEX "uq_refund_external" ON "users"."refund" ("provider", "external_id") WHERE "external_id" IS NOT NULL;
            CREATE UNIQUE INDEX "uq_refund_active_order" ON "users"."refund" ("order_id") WHERE "status" IN ('accepted', 'processing', 'unknown', 'succeeded');
            CREATE INDEX "idx_refund_due" ON "users"."refund" ("next_check_at") WHERE "status" IN ('accepted', 'processing', 'unknown')`);
    }

    /** Не допускает откат с потерей зарегистрированных финансовых операций. */
    public async down(runner: QueryRunner): Promise<void> {
        // Откат возможен только до появления истории возвратов, иначе требуется отдельная миграция данных.
        await runner.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM "users"."refund") THEN RAISE EXCEPTION 'Cannot discard refund history'; END IF;
            END $$`);
        // Удаляем пустой журнал после проверки сохранности данных.
        await runner.query('DROP TABLE "users"."refund"; DROP TYPE "users"."refund_state_enum"');
    }
}
