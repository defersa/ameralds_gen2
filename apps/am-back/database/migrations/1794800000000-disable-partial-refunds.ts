import type { MigrationInterface, QueryRunner } from 'typeorm';


export class DisablePartialRefunds1794800000000 implements MigrationInterface {
    public name = 'DisablePartialRefunds1794800000000';

    /** Запрещает частичные возвраты в новых и существующих заказах без переименования исторического enum. */
    public async up(runner: QueryRunner): Promise<void> {
        // Проверка блокирует частичное состояние на уровне БД; при неожиданных старых записях миграция откажет без изменения данных.
        await runner.query(`ALTER TABLE "users"."user_order_entity"
            ADD CONSTRAINT "CHK_order_no_partial_refund" CHECK ("status"::text <> 'partially_refunded')`);
    }

    /** Возвращает прежнее ограничение статусов без изменения сохранённых заказов. */
    public async down(runner: QueryRunner): Promise<void> {
        // Убираем только добавленную проверку; PostgreSQL enum и финансовая история остаются без изменений.
        await runner.query('ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "CHK_order_no_partial_refund"');
    }
}
