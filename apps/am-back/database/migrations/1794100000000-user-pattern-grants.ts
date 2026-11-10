import type { MigrationInterface, QueryRunner } from 'typeorm';


export class UserPatternGrants1794100000000 implements MigrationInterface {
    public name = 'UserPatternGrants1794100000000';

    /** Создаёт журнал независимых прав и переносит прежнее владение как явные legacy-основания без догадок о заказах. */
    public async up(runner: QueryRunner): Promise<void> {
        // Создаём журнал в транзакции миграции; RESTRICT сохраняет источники и финансовый/правовой аудит.
        await runner.query(`CREATE TABLE "patterns"."user_pattern_grant" (
            "id" SERIAL CONSTRAINT "pk_user_pattern_grant_id" PRIMARY KEY,
            "user_id" integer NOT NULL CONSTRAINT "fk_pattern_grant_user" REFERENCES "user_entity"("id") ON DELETE RESTRICT,
            "pattern_id" integer NOT NULL,
            "pattern_size_id" integer,
            "right_key" varchar(40) NOT NULL,
            "source_type" varchar(20) NOT NULL,
            "order_id" integer CONSTRAINT "fk_pattern_grant_order" REFERENCES "users"."user_order_entity"("id") ON DELETE RESTRICT,
            "order_item_id" integer CONSTRAINT "fk_pattern_grant_order_item" REFERENCES "patterns"."order_pattern_entity"("id") ON DELETE RESTRICT,
            "legacy_purchase_id" integer CONSTRAINT "fk_pattern_grant_legacy" REFERENCES "patterns"."user_pattern_entity"("id") ON DELETE RESTRICT,
            "created_at" timestamptz NOT NULL DEFAULT now(),
            "revoked_at" timestamptz,
            "revoke_reason" text,
            "revoked_by" integer CONSTRAINT "fk_pattern_grant_actor" REFERENCES "user_entity"("id") ON DELETE RESTRICT,
            "refund_reference" varchar(255),
            "migrated" boolean NOT NULL DEFAULT false,
            CONSTRAINT "chk_pattern_grant_right" CHECK (
                (pattern_size_id IS NULL AND right_key = 'color') OR
                (pattern_size_id IS NOT NULL AND right_key = 'size:' || pattern_size_id::text)),
            CONSTRAINT "chk_pattern_grant_source" CHECK (
                (source_type IN ('order', 'admin_order') AND order_id IS NOT NULL AND order_item_id IS NOT NULL AND legacy_purchase_id IS NULL) OR
                (source_type = 'legacy' AND order_id IS NULL AND order_item_id IS NULL AND legacy_purchase_id IS NOT NULL)),
            CONSTRAINT "chk_pattern_grant_revocation" CHECK (
                (revoked_at IS NULL AND revoke_reason IS NULL AND revoked_by IS NULL AND refund_reference IS NULL) OR
                (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL AND length(trim(revoke_reason)) > 0))
        )`);

        // Каждая прежняя строка владения — самостоятельное основание. Агрегированное владение не позволяет
        // достоверно восстановить конкретный заказ; inactive переносится с отзывом, orphan остаётся в старой таблице.
        await runner.query(`INSERT INTO "patterns"."user_pattern_grant"
            (user_id, pattern_id, pattern_size_id, right_key, source_type, legacy_purchase_id, created_at, revoked_at, revoke_reason, migrated)
            SELECT bought."userId", bought."patternId", selected."patternSizeEntityId", 'size:' || selected."patternSizeEntityId"::text,
                'legacy', bought.id, bought."createdAt",
                CASE WHEN bought.state = 'active' THEN NULL ELSE bought."updatedAt" END,
                CASE WHEN bought.state = 'active' THEN NULL ELSE 'legacy_inactive' END, true
            FROM "patterns"."user_pattern_entity" bought
            JOIN "patterns"."user_pattern_entity_sizes_pattern_size_entity" selected ON selected."userPatternEntityId" = bought.id
            JOIN "patterns"."pattern_size_entity" size ON size.id = selected."patternSizeEntityId" AND size."patternId" = bought."patternId"
            WHERE bought."userId" IS NOT NULL AND bought."patternId" IS NOT NULL`);

        // Цвет переносится отдельно от размеров, в том числе если последний размер уже отсутствует.
        await runner.query(`INSERT INTO "patterns"."user_pattern_grant"
            (user_id, pattern_id, right_key, source_type, legacy_purchase_id, created_at, revoked_at, revoke_reason, migrated)
            SELECT "userId", "patternId", 'color', 'legacy', id, "createdAt",
                CASE WHEN state = 'active' THEN NULL ELSE "updatedAt" END,
                CASE WHEN state = 'active' THEN NULL ELSE 'legacy_inactive' END, true
            FROM "patterns"."user_pattern_entity"
            WHERE color = true AND "userId" IS NOT NULL AND "patternId" IS NOT NULL`);

        // Обычные индексы создаются внутри атомарной миграции на новой таблице, до её использования приложением.
        await runner.query(`CREATE UNIQUE INDEX "uq_pattern_grant_order_right" ON "patterns"."user_pattern_grant" (order_item_id, right_key);
            CREATE UNIQUE INDEX "uq_pattern_grant_legacy_right" ON "patterns"."user_pattern_grant" (legacy_purchase_id, right_key);
            CREATE INDEX "idx_pattern_grant_effective" ON "patterns"."user_pattern_grant" (user_id, pattern_id) WHERE revoked_at IS NULL`);

        // Запрещаем удаление/перепривязку и повторный отзыв. Вставка сверяет оплаченные права со snapshot,
        // сохраняя удалённые ID каталога; legacy и административные позиции без snapshot проверяет по живым связям.
        await runner.query(`CREATE FUNCTION "patterns"."guard_pattern_grant"() RETURNS trigger AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'Pattern grant history cannot be deleted';
                END IF;
                IF TG_OP = 'UPDATE' THEN
                    IF (to_jsonb(NEW) - ARRAY['revoked_at', 'revoke_reason', 'revoked_by', 'refund_reference']) IS DISTINCT FROM
                       (to_jsonb(OLD) - ARRAY['revoked_at', 'revoke_reason', 'revoked_by', 'refund_reference']) OR
                       (OLD.revoked_at IS NOT NULL AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) THEN
                        RAISE EXCEPTION 'Pattern grant identity and revocation are immutable';
                    END IF;
                    RETURN NEW;
                END IF;
                IF NEW.source_type = 'legacy' THEN
                    IF NEW.pattern_size_id IS NOT NULL AND NOT EXISTS (
                        SELECT 1 FROM "patterns"."pattern_size_entity" size
                        WHERE size.id = NEW.pattern_size_id AND size."patternId" = NEW.pattern_id) THEN
                        RAISE EXCEPTION 'Pattern size does not belong to pattern';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM "patterns"."user_pattern_entity" bought
                        WHERE bought.id = NEW.legacy_purchase_id AND bought."userId" = NEW.user_id AND bought."patternId" = NEW.pattern_id) THEN
                        RAISE EXCEPTION 'Legacy source does not belong to owner';
                    END IF;
                ELSE
                    IF NOT EXISTS (SELECT 1 FROM "users"."user_order_entity" orders
                        JOIN "patterns"."order_pattern_entity" item ON item."orderId" = orders.id
                        WHERE orders.id = NEW.order_id AND orders."userId" = NEW.user_id AND orders.status = 'success'
                          AND orders."paidAt" IS NOT NULL AND orders.state = 'active'
                          AND item.id = NEW.order_item_id AND item.state = 'active'
                          AND ((NEW.source_type = 'admin_order') = (orders."sourceAdminOrderId" IS NOT NULL))
                          AND (
                            (item.snapshot IS NOT NULL AND item.snapshot->>'patternId' = NEW.pattern_id::text
                              AND (item."patternId" IS NULL OR item."patternId" = NEW.pattern_id)
                              AND (
                                (NEW.right_key = 'color' AND item.snapshot->>'color' = 'true') OR
                                (NEW.pattern_size_id IS NOT NULL AND EXISTS (
                                    SELECT 1 FROM jsonb_array_elements(item.snapshot->'sizes') selected
                                    WHERE selected->>'patternSizeId' = NEW.pattern_size_id::text))
                              )) OR
                            (item.snapshot IS NULL AND NEW.source_type = 'admin_order' AND item."patternId" = NEW.pattern_id
                              AND (
                                (NEW.right_key = 'color' AND item.color = true) OR
                                (NEW.pattern_size_id IS NOT NULL AND EXISTS (
                                    SELECT 1 FROM "patterns"."order_pattern_entity_sizes_pattern_size_entity" selected
                                    JOIN "patterns"."pattern_size_entity" size ON size.id = selected."patternSizeEntityId"
                                    WHERE selected."orderPatternEntityId" = item.id AND size.id = NEW.pattern_size_id
                                      AND size."patternId" = NEW.pattern_id AND size.state = 'active'))
                              ))
                          )) THEN
                        RAISE EXCEPTION 'Order source does not belong to owner or is not paid';
                    END IF;
                END IF;
                RETURN NEW;
            END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER "tr_pattern_grant" BEFORE INSERT OR UPDATE OR DELETE ON "patterns"."user_pattern_grant"
            FOR EACH ROW EXECUTE FUNCTION "patterns"."guard_pattern_grant"()`);
    }

    /** Откатывает только нетронутый импорт; новые выдачи и отзывы блокируют откат без потери истории. */
    public async down(runner: QueryRunner): Promise<void> {
        // Не допускаем удаления новых оснований или истории отзыва; прежняя проекция сама по себе не заменяет аудит.
        await runner.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM "patterns"."user_pattern_grant" WHERE NOT migrated OR revoked_by IS NOT NULL) THEN
                RAISE EXCEPTION 'Cannot rollback pattern grants after issuance or revocation';
            END IF;
        END $$`);

        // Старые строки владения и связи с размерами остаются неизменными при чистом up/down.
        await runner.query(`DROP TABLE "patterns"."user_pattern_grant";
            DROP FUNCTION IF EXISTS "patterns"."guard_pattern_grant"()`);
    }
}
