import type { MigrationInterface, QueryRunner } from 'typeorm';


export class PaymentAttempts1794000000000 implements MigrationInterface {
    public name = 'PaymentAttempts1794000000000';

    /** Переносит legacy-связь в историю попыток, сохраняя исходные цены и неизвестные финансовые результаты. */
    public async up(runner: QueryRunner): Promise<void> {
        // Добавляем nullable-поля для истории; новые попытки обязаны иметь полный денежный snapshot.
        await runner.query(`ALTER TABLE "users"."user_payment_entity"
            ADD "order_id" integer,
            ADD "provider" varchar(40) NOT NULL DEFAULT 'legacy',
            ADD "external_id" varchar(255), ADD "idempotency_key" uuid,
            ADD "status" varchar(20), ADD "amount" bigint, ADD "currency" varchar(3),
            ADD "confirmation_url" text, ADD "provider_status" varchar(40),
            ADD "paid_at" timestamptz, ADD "checked_at" timestamptz, ADD "error_code" varchar(40),
            ADD CONSTRAINT "fk_payment_order" FOREIGN KEY ("order_id") REFERENCES "users"."user_order_entity"("id") ON DELETE RESTRICT,
            ADD CONSTRAINT "uq_payment_idempotency" UNIQUE ("idempotency_key"),
            ADD CONSTRAINT "chk_payment_status" CHECK ("status" IS NULL OR "status" IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
            ADD CONSTRAINT "chk_payment_amount" CHECK ("amount" IS NULL OR ("amount" > 0 AND "amount" <= 9007199254740991)),
            ADD CONSTRAINT "chk_payment_currency" CHECK ("currency" IS NULL OR "currency" IN ('RUB', 'USD')),
            ADD CONSTRAINT "chk_payment_capture" CHECK ("provider" = 'legacy' OR (("status" = 'SUCCEEDED' AND "paid_at" IS NOT NULL) OR ("status" <> 'SUCCEEDED' AND "paid_at" IS NULL))),
            ADD CONSTRAINT "chk_payment_required" CHECK ("provider" = 'legacy' OR ("order_id" IS NOT NULL AND "status" IS NOT NULL AND "amount" IS NOT NULL AND "currency" IS NOT NULL AND "idempotency_key" IS NOT NULL))`);
        // Переносим существующие связи, не выводим финансовый результат из статуса заказа или двуязычной цены.
        await runner.query(`UPDATE "users"."user_payment_entity" payment SET "order_id" = orders."id"
            FROM "users"."user_order_entity" orders WHERE orders."paymentId" = payment."id"`);
        // Удаление колонки снимает прежние OneToOne FK и UNIQUE; сами платежи остаются.
        await runner.query('ALTER TABLE "users"."user_order_entity" DROP COLUMN "paymentId"');
        // Привязываем каждый клиентский UUID к попытке, в том числе когда параллельные вкладки используют разные ключи.
        await runner.query(`CREATE TABLE "users"."payment_request" (
            "idempotency_key" uuid NOT NULL,
            "payment_id" integer NOT NULL,
            CONSTRAINT "pk_payment_request_key" PRIMARY KEY ("idempotency_key"),
            CONSTRAINT "fk_payment_request_attempt" FOREIGN KEY ("payment_id") REFERENCES "users"."user_payment_entity"("id") ON DELETE RESTRICT
        )`);
        // Создаём индексы в транзакционной миграции: внешний ID уникален, активная попытка у заказа только одна.
        await runner.query(`CREATE INDEX "idx_payment_order" ON "users"."user_payment_entity" ("order_id");
            CREATE UNIQUE INDEX "uq_payment_external" ON "users"."user_payment_entity" ("provider", "external_id") WHERE "external_id" IS NOT NULL;
            CREATE UNIQUE INDEX "uq_payment_pending_order" ON "users"."user_payment_entity" ("order_id") WHERE "status" = 'PENDING'`);
        // Защищаем snapshot и терминальные состояния от обходных UPDATE; внешний ID присваивается только один раз.
        await runner.query(`CREATE FUNCTION "users"."guard_payment_attempt"() RETURNS trigger AS $$
            BEGIN
                IF ROW(NEW."order_id", NEW."provider", NEW."idempotency_key", NEW."amount", NEW."currency")
                    IS DISTINCT FROM ROW(OLD."order_id", OLD."provider", OLD."idempotency_key", OLD."amount", OLD."currency")
                THEN RAISE EXCEPTION 'Payment identity and amount are immutable'; END IF;
                IF OLD."external_id" IS NOT NULL AND NEW."external_id" IS DISTINCT FROM OLD."external_id"
                THEN RAISE EXCEPTION 'External payment identity is immutable'; END IF;
                IF OLD."status" IN ('SUCCEEDED', 'FAILED', 'CANCELLED') AND NEW."status" IS DISTINCT FROM OLD."status"
                THEN RAISE EXCEPTION 'Terminal payment status is immutable'; END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql;
            CREATE TRIGGER "tr_payment_attempt" BEFORE UPDATE ON "users"."user_payment_entity"
            FOR EACH ROW EXECUTE FUNCTION "users"."guard_payment_attempt"()`);
    }

    /** Восстанавливает OneToOne до появления новых попыток; иначе останавливает откат без потери истории. */
    public async down(runner: QueryRunner): Promise<void> {
        // Старый формат не вмещает новые попытки: проверяем до изменения схемы внутри транзакции миграции.
        await runner.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM "users"."user_payment_entity" WHERE "provider" <> 'legacy')
            THEN RAISE EXCEPTION 'Cannot discard payment attempt history'; END IF;
            END $$`);
        // Возвращаем исходную ссылку и имена ограничений для совместимости предыдущих миграций.
        await runner.query(`ALTER TABLE "users"."user_order_entity" ADD "paymentId" integer,
            ADD CONSTRAINT "REL_72cf41a6838b2f2d51b2f79b8c" UNIQUE ("paymentId"),
            ADD CONSTRAINT "FK_72cf41a6838b2f2d51b2f79b8ca" FOREIGN KEY ("paymentId") REFERENCES "users"."user_payment_entity"("id") ON DELETE SET NULL;
            UPDATE "users"."user_order_entity" orders SET "paymentId" = payment."id"
            FROM "users"."user_payment_entity" payment WHERE payment."order_id" = orders."id"`);
        // Снимаем защиту и новые колонки; старые totalPrice и BaseModel остаются без изменений.
        await runner.query(`DROP TRIGGER IF EXISTS "tr_payment_attempt" ON "users"."user_payment_entity";
            DROP FUNCTION IF EXISTS "users"."guard_payment_attempt"();
            DROP INDEX "users"."idx_payment_order";
            DROP INDEX "users"."uq_payment_external";
            DROP INDEX "users"."uq_payment_pending_order";
            ALTER TABLE "users"."user_payment_entity"
            DROP CONSTRAINT "chk_payment_required", DROP CONSTRAINT "chk_payment_status",
            DROP CONSTRAINT "chk_payment_amount", DROP CONSTRAINT "chk_payment_currency", DROP CONSTRAINT "chk_payment_capture",
            DROP COLUMN "order_id", DROP COLUMN "provider", DROP COLUMN "external_id", DROP COLUMN "idempotency_key",
            DROP COLUMN "status", DROP COLUMN "amount", DROP COLUMN "currency", DROP COLUMN "confirmation_url",
            DROP COLUMN "provider_status", DROP COLUMN "paid_at", DROP COLUMN "checked_at", DROP COLUMN "error_code"`);
        // Удаляем таблицу повторов только после проверки, что новых финансовых попыток ещё нет.
        await runner.query('DROP TABLE "users"."payment_request"');
    }
}
