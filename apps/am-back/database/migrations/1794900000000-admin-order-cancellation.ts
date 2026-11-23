import type { MigrationInterface, QueryRunner } from 'typeorm';


export class AdminOrderCancellation1794900000000 implements MigrationInterface {
    public name = 'AdminOrderCancellation1794900000000';

    /** Добавляет автора административной отмены и индекс стабильной сортировки оформленных заказов. */
    public async up(runner: QueryRunner): Promise<void> {
        // NULL сохраняет совместимость с пользовательскими, автоматическими и историческими отменами.
        await runner.query(`ALTER TABLE "users"."user_order_entity" ADD COLUMN "cancelled_by" integer,
            ADD CONSTRAINT "fk_order_cancellation_actor" FOREIGN KEY ("cancelled_by")
            REFERENCES "user_entity"("id") ON DELETE RESTRICT`);
        // Административный список исключает OPEN и сортируется по createdAt, затем ID.
        await runner.query(`CREATE INDEX "idx_placed_order_created_id" ON "users"."user_order_entity"
            ("createdAt" DESC, "id" DESC) WHERE "status" <> 'open'`);
    }

    /** Удаляет только индекс и добавленный аудит, не меняя статусы и финансовую историю. */
    public async down(runner: QueryRunner): Promise<void> {
        // Индекс удаляется перед возвратом схемы к прежней версии.
        await runner.query('DROP INDEX "users"."idx_placed_order_created_id"');
        // Удаляем внешний ключ вместе с его nullable-колонкой.
        await runner.query(
            'ALTER TABLE "users"."user_order_entity" DROP CONSTRAINT "fk_order_cancellation_actor", DROP COLUMN "cancelled_by"',
        );
    }
}
