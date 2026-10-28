import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'node:crypto';
import { LessThan } from 'typeorm';
import { DataSourceService } from '../data-source.service';
import { AuthEmailLimitEntity } from '../entities/tokens/auth-email-limit.entity';

// Общие лимиты регистрации и запроса входа; учитываются и неизвестные адреса.
export const AUTH_EMAIL_LIMITS = [
    { name: 'email-short', subject: 'email', limit: 3, windowMs: 15 * 60_000 },
    { name: 'email-day', subject: 'email', limit: 10, windowMs: 24 * 60 * 60_000 },
    { name: 'ip-short', subject: 'ip', limit: 20, windowMs: 10 * 60_000 },
    { name: 'ip-day', subject: 'ip', limit: 100, windowMs: 24 * 60 * 60_000 },
] as const;

@Injectable()
export class AuthEmailLimitService {
    constructor(private dataSource: DataSourceService) {}

    /** Возвращает Retry-After в секундах; 0 означает, что запрос разрешён. */
    public async consume(email: string, ip: string): Promise<number> {
        email = email.trim().toLowerCase();
        const policies = AUTH_EMAIL_LIMITS.map(policy => ({
            ...policy,
            key: createHash('sha256').update(`auth-email:${policy.name}:${policy.subject === 'email' ? email : ip}`).digest('hex'),
        })).sort((left, right) => left.key.localeCompare(right.key));

        // UPSERT блокирует счётчик, а единый порядок ключей исключает взаимную блокировку.
        // Транзакция и счётчики в PostgreSQL общие для всех экземпляров приложения.
        return this.dataSource.dataSource.transaction(async manager => {
            let retryAfter = 0;
            for (const policy of policies) {
                const [bucket]: { count: number; retryAfter: number }[] = await manager.query(`
                    INSERT INTO "users"."auth_email_limit_entity" ("key", "count", "resetAt")
                    VALUES ($1, 1, CURRENT_TIMESTAMP + $2 * interval '1 millisecond')
                    ON CONFLICT ("key") DO UPDATE SET
                        "count" = CASE WHEN "auth_email_limit_entity"."resetAt" <= CURRENT_TIMESTAMP THEN 1
                            ELSE LEAST("auth_email_limit_entity"."count" + 1, $3 + 1) END,
                        "resetAt" = CASE WHEN "auth_email_limit_entity"."resetAt" <= CURRENT_TIMESTAMP
                            THEN CURRENT_TIMESTAMP + $2 * interval '1 millisecond' ELSE "auth_email_limit_entity"."resetAt" END
                    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("resetAt" - CURRENT_TIMESTAMP))))::integer AS "retryAfter"
                `, [policy.key, policy.windowMs, policy.limit]);
                if (bucket.count > policy.limit) retryAfter = Math.max(retryAfter, bucket.retryAfter);
            }
            return retryAfter;
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    public async deleteExpiredLimits(): Promise<void> {
        await this.dataSource.getRepository(AuthEmailLimitEntity).delete({ resetAt: LessThan(new Date()) });
    }
}
