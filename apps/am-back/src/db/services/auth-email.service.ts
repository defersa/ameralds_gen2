import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { LessThan } from 'typeorm';
import { isLocalPath, isStrongPassword } from '@ameralds/utils';
import { DataSourceService } from '../data-source.service';
import { ModelState } from '../abstract/abstract.model';
import { AuthEmailRequestEntity, AuthEmailRequestKind } from '../entities/tokens/auth-email-request.entity';
import { UserService } from './user.service';
import { DEFAULT_LOGIN_REDIRECT, EmailLoginService } from './email-login.service';
import { ApiErrorCodes } from '../../modules/errors/errors.dto';
import { MailService } from '../../mail/mail.service';
import { getMailLogo } from '../../mail/mail-assets';
import { renderEmailLoginMail } from '../../mail/templates/email-login.template';
import { renderRegistrationMail } from '../../mail/templates/registration.template';

const MAX_ATTEMPTS = 5;
const REQUEST_TTL_MS = 24 * 60 * 60_000;
const LEASE_MS = 10 * 60_000;
const QUEUE_RETRY_MIN_MS = 5_000;
const QUEUE_RETRY_MAX_MS = 60_000;

@Injectable()
export class AuthEmailService {
    private readonly logger = new Logger(AuthEmailService.name);
    private running = false;
    private queueFailures = 0;
    private nextPollAt = 0;

    constructor(
        private dataSource: DataSourceService,
        private links: EmailLoginService,
        private users: UserService,
        private mail: MailService,
    ) {}

    public async requestLogin(email: string, redirectPath = DEFAULT_LOGIN_REDIRECT): Promise<void> {
        if (!isLocalPath(redirectPath)) throw new BadRequestException({ code: ApiErrorCodes.INVALID });
        await this.enqueue({ kind: AuthEmailRequestKind.LOGIN, email, passwordHash: null, redirectPath });
    }

    public async requestRegistration(email: string, password: string): Promise<void> {
        if (!isStrongPassword(password)) throw new BadRequestException({ code: ApiErrorCodes.INVALID_PASSWORD });
        // Хешируем для любого адреса, не проверяя существование аккаунта и не сохраняя пароль.
        const passwordHash = await bcrypt.hash(password, 10);
        await this.enqueue({ kind: AuthEmailRequestKind.REGISTRATION, email, passwordHash, redirectPath: DEFAULT_LOGIN_REDIRECT });
    }

    private async enqueue(details: Pick<AuthEmailRequestEntity, 'kind' | 'email' | 'passwordHash' | 'redirectPath'>): Promise<void> {
        const repository = this.dataSource.getRepository(AuthEmailRequestEntity);
        // В HTTP-запросе нет чтения пользователей и обращения к SMTP, включая неизвестные email.
        await repository.save(repository.create({ ...details, email: details.email.trim().toLowerCase(), availableAt: new Date() }));
    }

    @Interval(1000)
    public async processPendingRequests(): Promise<void> {
        if (this.running || Date.now() < this.nextPollAt) return;
        this.running = true;
        try {
            for (let index = 0; index < 10; index++) {
                const job = await this.claim();
                if (!job) break;
                if (job.attempts > MAX_ATTEMPTS) {
                    this.logger.warn(`Auth email job ${job.id} exceeded its retry limit`);
                    await this.dataSource.getRepository(AuthEmailRequestEntity).delete({ id: job.id, leaseToken: job.leaseToken });
                    continue;
                }
                try {
                    if (job.createdAt.valueOf() + REQUEST_TTL_MS > Date.now()) await this.deliver(job);
                    await this.dataSource.getRepository(AuthEmailRequestEntity).delete({ id: job.id, leaseToken: job.leaseToken });
                } catch {
                    // SMTP-ошибки могут содержать email и ссылки: не включаем их в логи.
                    this.logger.warn(`Auth email job ${job.id} failed (attempt ${job.attempts}/${MAX_ATTEMPTS})`);
                    const repository = this.dataSource.getRepository(AuthEmailRequestEntity);
                    const lease = { id: job.id, leaseToken: job.leaseToken };
                    if (job.attempts >= MAX_ATTEMPTS) await repository.delete(lease);
                    else await repository.update(lease, {
                        availableAt: new Date(Date.now() + 60_000 * 2 ** (job.attempts - 1)), leaseToken: null,
                    });
                }
            }
            this.queueFailures = 0;
            this.nextPollAt = 0;
        } catch (error: unknown) {
            this.queueFailures = Math.min(this.queueFailures + 1, 5);
            const retryMs = Math.min(QUEUE_RETRY_MIN_MS * 2 ** (this.queueFailures - 1), QUEUE_RETRY_MAX_MS);
            this.nextPollAt = Date.now() + retryMs;
            const details = error && typeof error === 'object' ? error as { code?: unknown; driverError?: { code?: unknown } } : undefined;
            const rawCode = details?.driverError?.code ?? details?.code;
            // Не логируем query, parameters, message и stack: там могут быть email и токены.
            const code = typeof rawCode === 'string' && /^(?:[0-9A-Z]{5}|E[A-Z_]{2,31})$/.test(rawCode) ? rawCode : 'UNKNOWN';
            const hint = code === '42P01' || code === '42703'
                ? ' Database schema is outdated; run npm run am:back:typeorm:migration:run.' : '';
            this.logger.error(`Unable to process auth email queue (code: ${code}). Retrying in ${retryMs / 1000}s.${hint}`);
        } finally {
            this.running = false;
        }
    }

    private async claim(): Promise<AuthEmailRequestEntity | null> {
        return this.dataSource.dataSource.transaction(async manager => {
            const repository = manager.getRepository(AuthEmailRequestEntity);
            const job = await repository.createQueryBuilder('request').addSelect('request.passwordHash')
                .where('request.availableAt <= :now', { now: new Date() })
                .orderBy('request.availableAt', 'ASC').addOrderBy('request.id', 'ASC')
                .take(1).setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
            if (!job) return null;
            job.leaseToken = randomUUID();
            job.availableAt = new Date(Date.now() + LEASE_MS);
            job.attempts += 1;
            await repository.save(job);
            return job;
        });
    }

    private async deliver(job: AuthEmailRequestEntity): Promise<void> {
        const user = await this.users.getUserByEmail(job.email);
        if (user && user.state !== ModelState.ACTIVE) return;
        if (!user && job.kind === AuthEmailRequestKind.LOGIN) return;

        const isRegistration = !user && job.kind === AuthEmailRequestKind.REGISTRATION;
        const url = isRegistration
            ? await this.links.createRegistrationLink(job.email, job.passwordHash)
            : await this.links.createLink(user.id, job.redirectPath);
        const template = isRegistration ? renderRegistrationMail(url) : renderEmailLoginMail(url);
        await this.mail.send({ to: job.email, ...template, attachments: [await getMailLogo()] });
    }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    public async deleteExpiredRequests(): Promise<void> {
        await this.dataSource.getRepository(AuthEmailRequestEntity).delete({ createdAt: LessThan(new Date(Date.now() - REQUEST_TTL_MS)) });
    }
}
