import type { MigrationInterface, QueryRunner } from "typeorm";


export class CheckoutPlacement1793900000000 implements MigrationInterface {
	public name = "CheckoutPlacement1793900000000";

	/** Добавляет время оформления без восстановления недостоверной истории и защищает его после checkout. */
	public async up(runner: QueryRunner): Promise<void> {
		// Старые заказы сохраняют NULL: точное время их оформления неизвестно.
		await runner.query('ALTER TABLE "users"."user_order_entity" ADD "placed_at" timestamptz');
		// Требуем дату для нового перехода OPEN → PENDING_PAYMENT и запрещаем менять её у оформленного заказа.
		await runner.query(`CREATE FUNCTION "users"."guard_checkout_placement"() RETURNS trigger AS $$
            BEGIN
                IF OLD."status" <> 'open' AND NEW."placed_at" IS DISTINCT FROM OLD."placed_at"
                THEN RAISE EXCEPTION 'Order placement time is immutable'; END IF;
                IF OLD."status" = 'open' AND NEW."status" = 'pending_payment' AND NEW."placed_at" IS NULL
                THEN RAISE EXCEPTION 'Checkout requires placement time'; END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql`);
		// Выполняем проверку перед обновлением заказа в той же транзакции, что и фиксация snapshot.
		await runner.query(`CREATE TRIGGER "TR_checkout_placement" BEFORE UPDATE ON "users"."user_order_entity"
            FOR EACH ROW EXECUTE FUNCTION "users"."guard_checkout_placement"()`);
	}

	/** Удаляет только добавленную дату и её защиту, сохраняя snapshot и прежние статусы заказов. */
	public async down(runner: QueryRunner): Promise<void> {
		// Снимаем триггер перед удалением функции и колонки.
		await runner.query('DROP TRIGGER IF EXISTS "TR_checkout_placement" ON "users"."user_order_entity"');
		// Функция больше не используется после удаления триггера.
		await runner.query('DROP FUNCTION IF EXISTS "users"."guard_checkout_placement"()');
		// Откатываем только поле текущей миграции.
		await runner.query('ALTER TABLE "users"."user_order_entity" DROP COLUMN "placed_at"');
	}
}
