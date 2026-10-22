import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { EntityManager, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSourceService } from '../data-source.service';
import { ModelState } from '../abstract/abstract.model';
import { TokenAccessEntity } from '../entities/tokens/token-access.entity';
import { TokenRefreshEntity } from '../entities/tokens/token-refresh.entity';
import { TokenEntity, TokenType } from '../entities/tokens/token.entity';
import { UserEntity } from '../entities/user.entity';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 28 * 24 * 60 * 60;

export interface SessionTokens {
    access: string;
    refresh: string;
    refreshExpiredAt: Date;
}

interface TokenPayload {
    sub: number;
    kind: TokenType;
    sid: string;
    jti: string;
    exp: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TokenService {
    constructor(private jwtService: JwtService, private dataSource: DataSourceService) {}

    public hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private verifyToken(token: string, kind: TokenType, ignoreExpiration = false): TokenPayload | null {
        if (typeof token !== 'string' || token.length > 2048) {
            return null;
        }
        try {
            const payload = this.jwtService.verify<TokenPayload>(token, { ignoreExpiration });
            if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0 || payload.kind !== kind ||
                typeof payload.sid !== 'string' || !UUID_PATTERN.test(payload.sid) ||
                typeof payload.jti !== 'string' || !UUID_PATTERN.test(payload.jti) || !Number.isFinite(payload.exp)) {
                return null;
            }
            return payload;
        } catch {
            return null;
        }
    }

    public createSession(userId: number): Promise<SessionTokens> {
        return this.dataSource.dataSource.transaction(async manager => {
            const user = await manager.getRepository(UserEntity).findOne({
                where: { id: userId, state: ModelState.ACTIVE }, lock: { mode: 'pessimistic_write' },
            });
            return user ? this.createPair(manager, userId, randomUUID(), new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)) : null;
        });
    }

    private async createPair(manager: EntityManager, userId: number, sessionId: string, refreshExpiredAt: Date): Promise<SessionTokens> {
        const create = async (kind: TokenType, lifetime: number): Promise<string> => {
            const value = this.jwtService.sign({ sub: userId, kind, sid: sessionId, jti: randomUUID() }, { expiresIn: lifetime });
            const expiredAt = new Date((this.jwtService.decode<TokenPayload>(value).exp) * 1000);
            const repository = manager.getRepository(kind === TokenType.ACCESS ? TokenAccessEntity : TokenRefreshEntity);
            await repository.save(repository.create({
                value: this.hashToken(value), expiredAt, sessionId, state: ModelState.ACTIVE, user: { id: userId },
            }));
            return value;
        };
        const remainingLifetime = Math.max(1, Math.floor((refreshExpiredAt.valueOf() - Date.now()) / 1000));
        const access = await create(TokenType.ACCESS, Math.min(ACCESS_TOKEN_TTL_SECONDS, remainingLifetime));
        const refresh = await create(TokenType.REFRESH, remainingLifetime);
        return { access, refresh, refreshExpiredAt: new Date(this.jwtService.decode<TokenPayload>(refresh).exp * 1000) };
    }

    public async getUserByAccessToken(token: string): Promise<UserEntity | null> {
        const payload = this.verifyToken(token, TokenType.ACCESS);
        if (!payload) {
            return null;
        }
        const record = await this.dataSource.getRepository(TokenAccessEntity).findOne({
            where: {
                value: this.hashToken(token), sessionId: payload.sid, state: ModelState.ACTIVE,
                expiredAt: MoreThan(new Date()), user: { id: payload.sub, state: ModelState.ACTIVE },
            },
            relations: { user: true },
        });
        return record?.user ?? null;
    }

    public async rotateRefreshToken(token: string): Promise<SessionTokens | null> {
        const payload = this.verifyToken(token, TokenType.REFRESH);
        if (!payload) {
            return null;
        }
        return this.dataSource.dataSource.transaction(async manager => {
            // Общая блокировка пользователя сериализует ротацию, replay и logout разных поколений сессии.
            const user = await manager.getRepository(UserEntity).findOne({
                where: { id: payload.sub, state: ModelState.ACTIVE }, lock: { mode: 'pessimistic_write' },
            });
            if (!user) {
                return null;
            }
            const repository = manager.getRepository(TokenRefreshEntity);
            const record = await repository.findOne({
                where: { value: this.hashToken(token), sessionId: payload.sid, user: { id: user.id } },
            });
            if (!record) {
                return null;
            }
            if (record.state !== ModelState.ACTIVE || record.expiredAt <= new Date()) {
                await manager.getRepository(TokenEntity).update({ sessionId: payload.sid }, { state: ModelState.INACTIVE });
                return null;
            }
            record.state = ModelState.INACTIVE;
            await repository.save(record);
            return this.createPair(manager, user.id, payload.sid, record.expiredAt);
        });
    }

    public async revokeSession(token: string): Promise<void> {
        const payload = this.verifyToken(token, TokenType.REFRESH, true);
        if (!payload) {
            return;
        }
        await this.dataSource.dataSource.transaction(async manager => {
            const user = await manager.getRepository(UserEntity).findOne({
                where: { id: payload.sub }, lock: { mode: 'pessimistic_write' },
            });
            if (!user) {
                return;
            }
            const record = await manager.getRepository(TokenRefreshEntity).findOne({
                where: { value: this.hashToken(token), sessionId: payload.sid, user: { id: user.id } },
            });
            if (record) {
                await manager.getRepository(TokenEntity).update({ sessionId: payload.sid }, { state: ModelState.INACTIVE });
            }
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    public async deleteExpiredTokens(): Promise<void> {
        await this.dataSource.getRepository(TokenEntity).delete({ expiredAt: LessThan(new Date()) });
    }
}
