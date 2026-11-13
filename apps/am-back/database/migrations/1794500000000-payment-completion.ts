import type { MigrationInterface, QueryRunner } from 'typeorm';


export class PaymentCompletion1794500000000 implements MigrationInterface {
    public name = 'PaymentCompletion1794500000000';

    /** Добавляет состояние разрешения списания, план сверки и очередь эффектов без изменения финансовой истории. */
    public async up(runner: QueryRunner): Promise<void> {
        // Поля сверки позволяют нескольким процессам разделять работу; старые SUCCEEDED также требуют финализации.
        await runner.query(`ALTER TABLE "users"."user_payment_entity"
            ADD "resolution" varchar(40),
            ADD "next_check_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ADD "check_failures" integer NOT NULL DEFAULT 0,
            ADD CONSTRAINT "chk_payment_check_failures" CHECK ("check_failures" >= 0),
            ADD CONSTRAINT "chk_payment_resolution" CHECK ("resolution" IS NULL OR ("status" = 'SUCCEEDED' AND "resolution" IN ('completed', 'compensation_required')));
            CREATE INDEX "idx_payment_reconciliation" ON "users"."user_payment_entity" ("next_check_at") WHERE "provider" <> 'legacy'`);
        // Outbox записывается в транзакции покупки; выполнение и повтор после сбоя происходят после коммита.
        await runner.query(`CREATE TYPE "users"."payment_effect_state_enum" AS ENUM ('active', 'inactive');
        CREATE TABLE "users"."payment_effect" (
            "id" SERIAL PRIMARY KEY,
            "state" "users"."payment_effect_state_enum" NOT NULL DEFAULT 'active',
            "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
            "effect_key" varchar(100) NOT NULL, "kind" varchar(40) NOT NULL,
            "order_id" integer NOT NULL,
            "payment_id" integer,
            "attempts" integer NOT NULL DEFAULT 0,
            "available_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" timestamptz,
            CONSTRAINT "uq_payment_effect_key" UNIQUE ("effect_key"),
            CONSTRAINT "fk_payment_effect_order" FOREIGN KEY ("order_id") REFERENCES "users"."user_order_entity"("id") ON DELETE RESTRICT,
            CONSTRAINT "fk_payment_effect_payment" FOREIGN KEY ("payment_id") REFERENCES "users"."user_payment_entity"("id") ON DELETE RESTRICT
        );
        CREATE INDEX "idx_payment_effect_due" ON "users"."payment_effect" ("available_at") WHERE "completed_at" IS NULL`);
        // Подтверждённое списание сильнее прежнего отказа/отмены; обратные переходы по устаревшим событиям запрещены.
        await runner.query(`CREATE OR REPLACE FUNCTION "users"."guard_payment_attempt"() RETURNS trigger AS $$
            BEGIN
                IF ROW(NEW."order_id", NEW."provider", NEW."idempotency_key", NEW."amount", NEW."currency")
                    IS DISTINCT FROM ROW(OLD."order_id", OLD."provider", OLD."idempotency_key", OLD."amount", OLD."currency")
                THEN RAISE EXCEPTION 'Payment identity and amount are immutable'; END IF;
                IF OLD."external_id" IS NOT NULL AND NEW."external_id" IS DISTINCT FROM OLD."external_id"
                THEN RAISE EXCEPTION 'External payment identity is immutable'; END IF;
                IF OLD."status" IN ('SUCCEEDED', 'FAILED', 'CANCELLED') AND NEW."status" IS DISTINCT FROM OLD."status"
                    AND NOT (OLD."status" IN ('FAILED', 'CANCELLED') AND NEW."status" = 'SUCCEEDED')
                THEN RAISE EXCEPTION 'Terminal payment status is immutable'; END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql`);
    }

    /** Не позволяет откатом удалить созданные инциденты и очередь внешних действий. */
    public async down(runner: QueryRunner): Promise<void> {
        // Отказываем до изменений схемы, если откат приведёт к потере новых финансовых данных.
        await runner.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM "users"."payment_effect") OR EXISTS (
                SELECT 1 FROM "users"."user_payment_entity" WHERE "resolution" IS NOT NULL)
            THEN RAISE EXCEPTION 'Cannot discard payment completion history'; END IF;
            END $$`);
        // Возвращаем строго терминальную модель предыдущего этапа до удаления новых полей.
        await runner.query(`CREATE OR REPLACE FUNCTION "users"."guard_payment_attempt"() RETURNS trigger AS $$
            BEGIN
                IF ROW(NEW."order_id", NEW."provider", NEW."idempotency_key", NEW."amount", NEW."currency")
                    IS DISTINCT FROM ROW(OLD."order_id", OLD."provider", OLD."idempotency_key", OLD."amount", OLD."currency")
                THEN RAISE EXCEPTION 'Payment identity and amount are immutable'; END IF;
                IF OLD."external_id" IS NOT NULL AND NEW."external_id" IS DISTINCT FROM OLD."external_id"
                THEN RAISE EXCEPTION 'External payment identity is immutable'; END IF;
                IF OLD."status" IN ('SUCCEEDED', 'FAILED', 'CANCELLED') AND NEW."status" IS DISTINCT FROM OLD."status"
                THEN RAISE EXCEPTION 'Terminal payment status is immutable'; END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql`);
        // Удаляем только пустую очередь и служебные поля после проверки сохранности истории.
        await runner.query(`DROP TABLE "users"."payment_effect";
            DROP TYPE "users"."payment_effect_state_enum";
            DROP INDEX "users"."idx_payment_reconciliation";
            ALTER TABLE "users"."user_payment_entity" DROP CONSTRAINT "chk_payment_check_failures", DROP CONSTRAINT "chk_payment_resolution",
                DROP "resolution", DROP "next_check_at", DROP "check_failures"`);
    }
}
