import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'node:crypto';
import { type DeepPartial, LessThan } from 'typeorm';
import { isLocalPath } from '@ameralds/utils';
import { DataSourceService } from '../data-source.service';
import { ModelState } from '../abstract/abstract.model';
import { EmailLoginLinkEntity } from '../entities/tokens/email-login-link.entity';
import { UserEntity } from '../entities/user.entity';
import { SessionTokens, TokenService } from './token.service';
import { UserService } from './user.service';
import { ApiErrorCodes } from '../../modules/errors/errors.dto';

export const EMAIL_LOGIN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_LOGIN_REDIRECT = '/account/profile';

@Injectable()
export class EmailLoginService {
    constructor(
        private dataSource: DataSourceService,
        private tokens: TokenService,
        private users: UserService,
    ) {}

    /** Переиспользуется для писем со входом и переходом к нужной странице сайта. */
    public async createLink(userId: number, redirectPath = DEFAULT_LOGIN_REDIRECT): Promise<string> {
        if (!isLocalPath(redirectPath)) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID });
        }
        const user = await this.dataSource.getRepository(UserEntity).findOneBy({ id: userId, state: ModelState.ACTIVE });
        if (!user) {
            throw new UnauthorizedException({ code: ApiErrorCodes.UNAUTHORIZED });
        }
        return this.issueLink({ user, redirectPath });
    }

    /** Аккаунт и пароль создаются только после подтверждения адреса по этой ссылке. */
    public async createRegistrationLink(email: string, passwordHash: string): Promise<string> {
        if (typeof passwordHash !== 'string' || !/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
            throw new Error('Invalid registration password hash');
        }
        return this.issueLink({ registrationEmail: email.trim().toLowerCase(), registrationPasswordHash: passwordHash, redirectPath: DEFAULT_LOGIN_REDIRECT });
    }

    private async issueLink(details: DeepPartial<EmailLoginLinkEntity>): Promise<string> {
        const siteUrl = process.env.SITE_URL || (process.env.NODE_ENV === 'dev' ? 'http://localhost:4400' : '');
        const url = new URL('/auth/email', siteUrl);
        if (!['https:', 'http:'].includes(url.protocol) || (process.env.NODE_ENV !== 'dev' && url.protocol !== 'https:')) {
            throw new Error('SITE_URL must use HTTPS outside development');
        }
        const token = randomBytes(32).toString('base64url');
        const repository = this.dataSource.getRepository(EmailLoginLinkEntity);
        await repository.save(repository.create({
            ...details, tokenHash: this.tokens.hashToken(token), expiredAt: new Date(Date.now() + EMAIL_LOGIN_TTL_MS),
        }));
        // Fragment не попадает в HTTP-запросы, серверные логи и Referer.
        url.hash = new URLSearchParams({ token }).toString();
        return url.toString();
    }

    public async signIn(token: string): Promise<SessionTokens & { redirectPath: string }> {
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
            throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
        }
        return this.dataSource.dataSource.transaction(async manager => {
            const repository = manager.getRepository(EmailLoginLinkEntity);
            const link = await repository.findOne({
                where: { tokenHash: this.tokens.hashToken(token) },
                select: { id: true, state: true, expiredAt: true, redirectPath: true, registrationEmail: true, registrationPasswordHash: true },
                relations: { user: true }, relationLoadStrategy: 'query', lock: { mode: 'pessimistic_write' },
            });
            if (!link || link.state !== ModelState.ACTIVE || link.expiredAt <= new Date() ||
                !isLocalPath(link.redirectPath)) {
                throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
            }
            if (!link.user && link.registrationEmail && link.registrationPasswordHash) {
                // ON CONFLICT не позволяет двум ссылкам перезаписать пароль друг друга
                // или пароль аккаунта, созданного заказом во время ожидания подтверждения.
                link.user = await this.users.getOrCreateRegisteredUser(link.registrationEmail, link.registrationPasswordHash, manager);
            }
            if (link.user?.state !== ModelState.ACTIVE) {
                throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
            }
            const session = await this.tokens.createSession(link.user.id, manager);
            if (!session) {
                throw new UnauthorizedException({ code: ApiErrorCodes.EXPIRED });
            }
            link.state = ModelState.INACTIVE;
            link.registrationEmail = null;
            link.registrationPasswordHash = null;
            await repository.save(link);
            return { ...session, redirectPath: link.redirectPath };
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    public async deleteExpiredLinks(): Promise<void> {
        await this.dataSource.getRepository(EmailLoginLinkEntity).delete({ expiredAt: LessThan(new Date()) });
    }
}
