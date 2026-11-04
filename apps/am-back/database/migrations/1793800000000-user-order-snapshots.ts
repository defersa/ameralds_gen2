import type { MigrationInterface, QueryRunner } from "typeorm";


export class UserOrderSnapshots1793800000000 implements MigrationInterface {
	public name = "UserOrderSnapshots1793800000000";

	/**
	 * Добавляет денежные snapshot и ограничения неизменяемости оформленных заказов, объединяет дубли
	 * OPEN-корзин. Временные таблицы требуют запуска миграции в транзакции.
	 */
	public async up(runner: QueryRunner): Promise<void> {
		// Расширяем enum состоянием частичного возврата без изменения существующих статусов.
		await runner.query(
			`ALTER TYPE "users"."user_order_entity_status_enum" ADD VALUE IF NOT EXISTS 'partially_refunded'`,
		);
		// Добавляем состояние полного возврата, сохраняя совместимость старых значений enum.
		await runner.query(`ALTER TYPE "users"."user_order_entity_status_enum" ADD VALUE IF NOT EXISTS 'refunded'`);
		// Добавляем суммы в минимальных денежных единицах и ограничения их согласованности; неизвестная цена
		// допустима только с пустыми скидками.
		await runner.query(`ALTER TABLE "users"."user_order_entity"
            ADD "subtotalAmount" bigint, ADD "discountAmount" bigint NOT NULL DEFAULT 0,
            ADD "totalAmount" bigint, ADD "currency" varchar(3), ADD "discounts" jsonb NOT NULL DEFAULT '[]',
            ADD "paidAt" timestamptz,
            ADD CONSTRAINT "CHK_order_amounts" CHECK (
                "discountAmount" BETWEEN 0 AND 9007199254740991 AND jsonb_typeof("discounts") = 'array' AND
                (("subtotalAmount" IS NULL AND "totalAmount" IS NULL AND "currency" IS NULL AND "discountAmount" = 0 AND "discounts" = '[]') OR
                 ("subtotalAmount" IS NOT NULL AND "totalAmount" IS NOT NULL AND "currency" IS NOT NULL AND
                  "currency" IN ('RUB', 'USD') AND "subtotalAmount" BETWEEN 0 AND 9007199254740991 AND
                  "totalAmount" BETWEEN 0 AND 9007199254740991 AND "totalAmount" = "subtotalAmount" - "discountAmount"))
            )`);
		// Добавляем независимый JSONB snapshot выбранной схемы и её цены к позиции заказа.
		await runner.query('ALTER TABLE "patterns"."order_pattern_entity" ADD "snapshot" jsonb');
		// У старых заказов нет достоверной цены. Не восстанавливаем её из сегодняшнего каталога.
		// Pending без snapshot нельзя оставлять доступным к оплате.
		await runner.query(`UPDATE "users"."user_order_entity" SET "status" = 'cancel',
            "cancelledAt" = clock_timestamp(), "cancelReason" = 'legacy_missing_price_snapshot'
            WHERE "status" = 'pending_payment'`);

		// Состав старых дублирующих корзин переносим в последнюю активную OPEN.
		await runner.query(`WITH carts AS (
            SELECT "id", max("id") OVER (PARTITION BY "userId") AS keeper
            FROM "users"."user_order_entity" WHERE "status" = 'open' AND "state" = 'active' AND "userId" IS NOT NULL
        ) UPDATE "patterns"."order_pattern_entity" item SET "orderId" = carts.keeper
            FROM carts WHERE item."orderId" = carts."id" AND carts."id" <> carts.keeper`);
		// В пределах транзакции запоминаем минимальный id позиции каждой схемы для объединения дублей; таблица
		// удалится при COMMIT.
		await runner.query(`CREATE TEMP TABLE ams7_cart_items ON COMMIT DROP AS
            SELECT item."id", min(item."id") OVER (PARTITION BY item."orderId", item."patternId") AS keeper
            FROM "patterns"."order_pattern_entity" item JOIN "users"."user_order_entity" cart ON cart."id" = item."orderId"
            WHERE cart."status" = 'open' AND cart."state" = 'active' AND item."patternId" IS NOT NULL AND item."state" = 'active'`);
		// Объединяем размеры повторяющихся позиций в сохраняемой позиции, не создавая повторных связей.
		await runner.query(`INSERT INTO "patterns"."order_pattern_entity_sizes_pattern_size_entity" ("orderPatternEntityId", "patternSizeEntityId")
            SELECT DISTINCT items.keeper, sizes."patternSizeEntityId" FROM ams7_cart_items items
            JOIN "patterns"."order_pattern_entity_sizes_pattern_size_entity" sizes ON sizes."orderPatternEntityId" = items."id"
            ON CONFLICT DO NOTHING`);
		// Объединяем признаки покупки схемы и цвета через bool_or, сохраняя все выбранные пользователем опции.
		await runner.query(`UPDATE "patterns"."order_pattern_entity" item SET "color" = flags.color,
            "requiresPatternPurchase" = flags.purchase FROM (
                SELECT items.keeper, bool_or(source."color") AS color, bool_or(source."requiresPatternPurchase") AS purchase
                FROM ams7_cart_items items JOIN "patterns"."order_pattern_entity" source ON source."id" = items."id" GROUP BY items.keeper
            ) flags WHERE item."id" = flags.keeper`);
		// Удаляем связи размеров дублирующих позиций после их переноса в сохраняемую позицию.
		await runner.query(
			`DELETE FROM "patterns"."order_pattern_entity_sizes_pattern_size_entity" WHERE "orderPatternEntityId" IN (SELECT "id" FROM ams7_cart_items WHERE "id" <> keeper)`,
		);
		// Удаляем дубли позиций, чьи размеры и признаки покупки уже объединены.
		await runner.query(
			`DELETE FROM "patterns"."order_pattern_entity" WHERE "id" IN (SELECT "id" FROM ams7_cart_items WHERE "id" <> keeper)`,
		);
		// Архивируем лишние активные OPEN-корзины, оставляя последнюю корзину каждого пользователя.
		await runner.query(`WITH carts AS (
            SELECT "id", max("id") OVER (PARTITION BY "userId") AS keeper FROM "users"."user_order_entity"
            WHERE "status" = 'open' AND "state" = 'active' AND "userId" IS NOT NULL
        ) UPDATE "users"."user_order_entity" cart SET "state" = 'inactive' FROM carts
            WHERE cart."id" = carts."id" AND carts."id" <> carts.keeper`);
		// Гарантируем единственную активную OPEN-корзину на пользователя частичным уникальным индексом.
		await runner.query(`CREATE UNIQUE INDEX "IDX_user_order_one_open" ON "users"."user_order_entity" ("userId")
            WHERE "status" = 'open' AND "state" = 'active' AND "userId" IS NOT NULL`);
		// Запрещаем состояние pending_payment без зафиксированных сумм и валюты.
		await runner.query(`ALTER TABLE "users"."user_order_entity" ADD CONSTRAINT "CHK_pending_order_snapshot"
            CHECK ("status" <> 'pending_payment' OR ("subtotalAmount" IS NOT NULL AND "totalAmount" IS NOT NULL AND "currency" IS NOT NULL))`);

		// Защищаем оформленные заказы от изменения цены и окна оплаты, проверяем переходы статусов и
		// согласованность итогов с snapshot позиций.
		await runner.query(`CREATE FUNCTION "users"."guard_order_snapshot"() RETURNS trigger AS $$
        DECLARE subtotal numeric; discount numeric; total numeric;
        BEGIN
            IF TG_OP = 'DELETE' THEN
                IF OLD."status" <> 'open' THEN RAISE EXCEPTION 'Placed order is immutable'; END IF;
                RETURN OLD;
            END IF;
            IF TG_OP = 'UPDATE' AND OLD."status" <> 'open' THEN
                IF ROW(NEW."paymentExpiresAt", NEW."appSettingsVersion") IS DISTINCT FROM ROW(OLD."paymentExpiresAt", OLD."appSettingsVersion")
                THEN RAISE EXCEPTION 'Order payment window is immutable after checkout'; END IF;
                IF ROW(NEW."subtotalAmount", NEW."discountAmount", NEW."totalAmount", NEW."currency", NEW."discounts")
                    IS DISTINCT FROM ROW(OLD."subtotalAmount", OLD."discountAmount", OLD."totalAmount", OLD."currency", OLD."discounts")
                THEN RAISE EXCEPTION 'Order price is immutable after checkout'; END IF;
                IF NEW."status" <> OLD."status" AND NOT (
                    (OLD."status" = 'pending_payment' AND NEW."status"::text IN ('success', 'cancel')) OR
                    (OLD."status"::text = 'success' AND NEW."status"::text IN ('partially_refunded', 'refunded')) OR
                    (OLD."status"::text = 'partially_refunded' AND NEW."status"::text = 'refunded')
                ) THEN RAISE EXCEPTION 'Invalid order status transition'; END IF;
            END IF;
            IF TG_OP = 'UPDATE' AND OLD."status" = 'open' AND (
                NEW."status"::text IN ('partially_refunded', 'refunded') OR
                (NEW."status" = 'success' AND NEW."sourceAdminOrderId" IS NULL)
            ) THEN RAISE EXCEPTION 'Invalid order status transition'; END IF;
            IF NEW."status" = 'pending_payment' AND (TG_OP = 'INSERT' OR OLD."status" = 'open') THEN
                IF NOT EXISTS (SELECT 1 FROM "patterns"."order_pattern_entity" WHERE "orderId" = NEW."id") OR EXISTS (
                    SELECT 1 FROM "patterns"."order_pattern_entity" item WHERE item."orderId" = NEW."id" AND (
                        item."state" <> 'active' OR item."patternId" IS NULL OR item."snapshot" IS NULL OR
                        item."snapshot"->>'currency' IS DISTINCT FROM NEW."currency" OR
                        item."snapshot"->>'patternId' IS DISTINCT FROM item."patternId"::text OR
                        item."snapshot"->>'color' IS DISTINCT FROM item."color"::text OR
                        item."snapshot"->>'requiresPatternPurchase' IS DISTINCT FROM item."requiresPatternPurchase"::text OR
                        jsonb_typeof(item."snapshot"->'sizes') IS DISTINCT FROM 'array' OR
                        jsonb_typeof(item."snapshot"->'components') IS DISTINCT FROM 'array' OR
                        jsonb_typeof(item."snapshot"->'discounts') IS DISTINCT FROM 'array' OR
                        NOT (COALESCE(item."snapshot"->>'subtotalAmount', '') ~ '^[0-9]+$') OR
                        NOT (COALESCE(item."snapshot"->>'discountAmount', '') ~ '^[0-9]+$') OR
                        NOT (COALESCE(item."snapshot"->>'totalAmount', '') ~ '^[0-9]+$')
                    )
                ) THEN RAISE EXCEPTION 'Pending order requires complete item snapshots'; END IF;
                IF EXISTS (SELECT 1 FROM "patterns"."order_pattern_entity" item WHERE item."orderId" = NEW."id" AND (
                    (item."snapshot"->>'subtotalAmount')::numeric > 9007199254740991 OR
                    (item."snapshot"->>'totalAmount')::numeric <> (item."snapshot"->>'subtotalAmount')::numeric - (item."snapshot"->>'discountAmount')::numeric OR
                    (SELECT COALESCE(jsonb_agg((s->>'patternSizeId')::integer ORDER BY (s->>'patternSizeId')::integer), '[]') FROM jsonb_array_elements(item."snapshot"->'sizes') s)
                    IS DISTINCT FROM (SELECT COALESCE(jsonb_agg("patternSizeEntityId" ORDER BY "patternSizeEntityId"), '[]') FROM "patterns"."order_pattern_entity_sizes_pattern_size_entity" WHERE "orderPatternEntityId" = item."id")
                )) THEN RAISE EXCEPTION 'Invalid item price or selection snapshot'; END IF;
                SELECT sum(("snapshot"->>'subtotalAmount')::numeric), sum(("snapshot"->>'discountAmount')::numeric), sum(("snapshot"->>'totalAmount')::numeric)
                    INTO subtotal, discount, total FROM "patterns"."order_pattern_entity" WHERE "orderId" = NEW."id";
                IF ROW(subtotal, discount, total) IS DISTINCT FROM ROW(NEW."subtotalAmount"::numeric, NEW."discountAmount"::numeric, NEW."totalAmount"::numeric)
                THEN RAISE EXCEPTION 'Order amounts do not match item snapshots'; END IF;
            END IF;
            RETURN NEW;
        END; $$ LANGUAGE plpgsql`);
		// Подключаем проверку неизменяемости и согласованности snapshot к вставке, обновлению и удалению
		// заказов.
		await runner.query(`CREATE TRIGGER "TR_order_snapshot" BEFORE INSERT OR UPDATE OR DELETE ON "users"."user_order_entity"
            FOR EACH ROW EXECUTE FUNCTION "users"."guard_order_snapshot"()`);

		// Блокируем затронутые заказы в порядке id и запрещаем менять оформленные позиции; допускаем только
		// обнуление FK удалённой схемы без изменения snapshot.
		await runner.query(`CREATE FUNCTION "patterns"."guard_order_item_snapshot"() RETURNS trigger AS $$
        DECLARE order_id integer; order_status text;
        BEGIN
            FOR order_id IN SELECT DISTINCT value FROM unnest(ARRAY[
                CASE WHEN TG_OP <> 'INSERT' THEN OLD."orderId" END,
                CASE WHEN TG_OP <> 'DELETE' THEN NEW."orderId" END
            ]) value WHERE value IS NOT NULL ORDER BY value LOOP
                SELECT "status"::text INTO order_status FROM "users"."user_order_entity" WHERE "id" = order_id FOR UPDATE;
                IF order_status <> 'open' THEN
                    -- FK SET NULL при удалении каталога сохраняет сам snapshot.
                    IF NOT (TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 AND OLD."patternId" IS NOT NULL AND NEW."patternId" IS NULL
                        AND (to_jsonb(NEW) - 'patternId') = (to_jsonb(OLD) - 'patternId'))
                    THEN RAISE EXCEPTION 'Placed order items are immutable'; END IF;
                END IF;
            END LOOP;
            IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
            RETURN NEW;
        END; $$ LANGUAGE plpgsql`);
		// Подключаем защиту исторических позиций к изменениям таблицы позиций заказа.
		await runner.query(`CREATE TRIGGER "TR_order_item_snapshot" BEFORE INSERT OR UPDATE OR DELETE ON "patterns"."order_pattern_entity"
            FOR EACH ROW EXECUTE FUNCTION "patterns"."guard_order_item_snapshot"()`);
		// Блокируем заказы в порядке id и запрещаем менять набор размеров после оформления; каскадное удаление
		// размера каталога не уничтожает snapshot.
		await runner.query(`CREATE FUNCTION "patterns"."guard_order_item_sizes"() RETURNS trigger AS $$
        DECLARE order_id integer; order_status text;
        BEGIN
            -- Удаление размера из каталога чистит FK-связь, история остаётся в snapshot.
            IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
            FOR order_id IN SELECT DISTINCT item."orderId" FROM "patterns"."order_pattern_entity" item WHERE item."id" IN (
                CASE WHEN TG_OP <> 'INSERT' THEN OLD."orderPatternEntityId" END,
                CASE WHEN TG_OP <> 'DELETE' THEN NEW."orderPatternEntityId" END
            ) AND item."orderId" IS NOT NULL ORDER BY item."orderId" LOOP
                SELECT "status"::text INTO order_status FROM "users"."user_order_entity" WHERE "id" = order_id FOR UPDATE;
                IF order_status <> 'open' THEN RAISE EXCEPTION 'Placed order sizes are immutable'; END IF;
            END LOOP;
            IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
            RETURN NEW;
        END; $$ LANGUAGE plpgsql`);
		// Подключаем защиту набора размеров к изменениям связующей таблицы.
		await runner.query(`CREATE TRIGGER "TR_order_item_sizes" BEFORE INSERT OR UPDATE OR DELETE ON "patterns"."order_pattern_entity_sizes_pattern_size_entity"
            FOR EACH ROW EXECUTE FUNCTION "patterns"."guard_order_item_sizes"()`);
		// Исправляем старый SET NULL на NOT NULL колонке junction-таблицы.
		await runner.query(`ALTER TABLE "patterns"."order_pattern_entity_sizes_pattern_size_entity" DROP CONSTRAINT "FK_2ee51f9463aad0789c1da55a194",
            ADD CONSTRAINT "FK_2ee51f9463aad0789c1da55a194" FOREIGN KEY ("orderPatternEntityId") REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
		// Запрещаем TRUNCATE, если в истории существует хотя бы один заказ вне статуса OPEN.
		await runner.query(`CREATE FUNCTION "users"."guard_order_truncate"() RETURNS trigger AS $$
            BEGIN
                IF EXISTS (SELECT 1 FROM "users"."user_order_entity" WHERE "status" <> 'open')
                THEN RAISE EXCEPTION 'Placed order history is immutable'; END IF;
                RETURN NULL;
            END; $$ LANGUAGE plpgsql`);
		for (const table of [
			'"users"."user_order_entity"',
			'"patterns"."order_pattern_entity"',
			'"patterns"."order_pattern_entity_sizes_pattern_size_entity"',
		]) {
			// Устанавливаем защиту TRUNCATE на заказы, позиции и связи размеров.
			await runner.query(`CREATE TRIGGER "TR_order_no_truncate" BEFORE TRUNCATE ON ${table}
                FOR EACH STATEMENT EXECUTE FUNCTION "users"."guard_order_truncate"()`);
		}
	}

	/**
	 * Удаляет добавленные snapshot, проверки и триггеры; сохраняет новые значения enum и не разделяет
	 * объединённые корзины обратно.
	 */
	public async down(runner: QueryRunner): Promise<void> {
		for (const table of [
			'"users"."user_order_entity"',
			'"patterns"."order_pattern_entity"',
			'"patterns"."order_pattern_entity_sizes_pattern_size_entity"',
		]) {
			// Снимаем защиту TRUNCATE с таблицы при откате миграции.
			await runner.query(`DROP TRIGGER IF EXISTS "TR_order_no_truncate" ON ${table}`);
		}
		// Удаляем функцию защиты TRUNCATE после снятия всех её триггеров.
		await runner.query('DROP FUNCTION IF EXISTS "users"."guard_order_truncate"()');
		// Отключаем защиту изменения выбранных размеров при откате.
		await runner.query(
			'DROP TRIGGER IF EXISTS "TR_order_item_sizes" ON "patterns"."order_pattern_entity_sizes_pattern_size_entity"',
		);
		// Удаляем функцию проверки неизменяемости размеров после отключения триггера.
		await runner.query('DROP FUNCTION IF EXISTS "patterns"."guard_order_item_sizes"()');
		// Отключаем защиту исторических позиций заказа при откате.
		await runner.query('DROP TRIGGER IF EXISTS "TR_order_item_snapshot" ON "patterns"."order_pattern_entity"');
		// Удаляем функцию защиты snapshot позиции после отключения триггера.
		await runner.query('DROP FUNCTION IF EXISTS "patterns"."guard_order_item_snapshot"()');
		// Отключаем проверку исторических сумм и переходов статуса заказа при откате.
		await runner.query('DROP TRIGGER IF EXISTS "TR_order_snapshot" ON "users"."user_order_entity"');
		// Удаляем функцию защиты заказа после отключения триггера.
		await runner.query('DROP FUNCTION IF EXISTS "users"."guard_order_snapshot"()');
		// Удаляем ограничения наличия snapshot и согласованности денежных сумм при откате.
		await runner.query(
			'ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT IF EXISTS "CHK_pending_order_snapshot", DROP CONSTRAINT IF EXISTS "CHK_order_amounts"',
		);
		// Снимаем ограничение единственной активной OPEN-корзины пользователя.
		await runner.query('DROP INDEX IF EXISTS "users"."IDX_user_order_one_open"');
		// Удаляем исторический snapshot из позиций заказа при откате схемы.
		await runner.query('ALTER TABLE "patterns"."order_pattern_entity" DROP COLUMN "snapshot"');
		// Удаляем денежные итоги, валюту, скидки и дату оплаты, добавленные этой миграцией.
		await runner.query(`ALTER TABLE "users"."user_order_entity" DROP COLUMN "subtotalAmount", DROP COLUMN "discountAmount",
            DROP COLUMN "totalAmount", DROP COLUMN "currency", DROP COLUMN "discounts", DROP COLUMN "paidAt"`);
		// Значения enum аддитивны: откат не превращает возвращённые покупки в оплаченные.
		// Объединённые корзины также не разделяются обратно, чтобы не потерять новые изменения.
	}
}
