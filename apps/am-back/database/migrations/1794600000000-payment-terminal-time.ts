import type { MigrationInterface, QueryRunner } from 'typeorm';


export class PaymentTerminalTime1794600000000 implements MigrationInterface {
    public name = 'PaymentTerminalTime1794600000000';

    /** Добавляет начало окна поздних списаний; для прежних конечных результатов использует время последнего изменения. */
    public async up(runner: QueryRunner): Promise<void> {
        // Отдельное время результата не сдвигается при последующих проверках статуса и ошибках API.
        await runner.query('ALTER TABLE "users"."user_payment_entity" ADD "terminal_at" timestamptz');
        // Точного времени перехода старых попыток нет: updatedAt даёт консервативное окно, не короче времени перехода.
        // Приведение timestamp использует часовой пояс БД, в котором ранее записывался updatedAt.
        await runner.query(`UPDATE "users"."user_payment_entity"
            SET "terminal_at" = "updatedAt"::timestamptz
            WHERE "provider" <> 'legacy' AND "status" IN ('SUCCEEDED', 'FAILED', 'CANCELLED')`);
    }

    /** Удаляет служебное время сверки, сохраняя финансовую историю и статусы попыток. */
    public async down(runner: QueryRunner): Promise<void> {
        // Откат не меняет суммы, статусы, результаты завершения покупки и очередь компенсаций.
        await runner.query('ALTER TABLE "users"."user_payment_entity" DROP COLUMN "terminal_at"');
    }
}
