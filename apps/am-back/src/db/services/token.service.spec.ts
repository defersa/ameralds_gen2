import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcrypt';
import { createHash } from 'node:crypto';
import { ModelState } from '../abstract/abstract.model';
import { DataSourceService } from '../data-source.service';
import { TokenEntity, TokenType } from '../entities/tokens/token.entity';
import { TokenAccessEntity } from '../entities/tokens/token-access.entity';
import { TokenRefreshEntity } from '../entities/tokens/token-refresh.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, TokenService } from './token.service';
import { JWT_AUDIENCE, JWT_ISSUER } from '../../core/jwt/jwt.module';
import { UserService } from './user.service';

const secret = 'test-only-secret-for-authentication-regressions';
const passwordHash = hashSync('Password123!', 10);

describe('authentication session lifecycle', () => {
    let service: TokenService;
    let userService: UserService;
    let jwt: JwtService;
    let user: UserEntity;
    let records: (TokenEntity & { user: UserEntity; kind: TokenType })[];
    let failSave: boolean;
    let userRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
    let tokenRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; update: jest.Mock };

    beforeEach(() => {
        records = [];
        failSave = false;
        user = Object.assign(new UserEntity(), { id: 1, email: 'test@example.com', state: ModelState.ACTIVE, role: UserRole.COMMON, passwordHash });
        jwt = new JwtService({
            secret,
            signOptions: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, algorithm: 'HS256' },
            verifyOptions: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, algorithms: ['HS256'] },
        });
        userRepository = {
            findOne: jest.fn(async ({ where, select }) => {
                const email = typeof where.email === 'object' ? where.email.objectLiteralParameters.email : where.email;
                if ((where.id && where.id !== user.id) || (email && email !== user.email.toLowerCase()) || (where.state && where.state !== user.state)) return null;
                return select?.passwordHash ? user : Object.assign(new UserEntity(), user, { passwordHash: undefined });
            }),
            create: jest.fn(value => value), save: jest.fn(async value => value),
        };
        const repositoryFor = (kind?: TokenType) => ({
            create: jest.fn(value => ({ ...value, user, kind, id: records.length + 1 })),
            save: jest.fn(async value => {
                if (failSave) throw new Error('Database save failed');
                if (!records.includes(value)) records.push(value);
                return value;
            }),
            findOne: jest.fn(async ({ where }) => records.find(record =>
                (!kind || record.kind === kind) && record.value === where.value && record.sessionId === where.sessionId &&
                (!where.state || record.state === where.state) && (!where.expiredAt || record.expiredAt > new Date()) &&
                (!where.user || ((!where.user.id || where.user.id === user.id) && (!where.user.state || where.user.state === user.state))),
            ) ?? null),
            update: jest.fn(async ({ sessionId }, { state }) => {
                for (const record of records.filter(record => record.sessionId === sessionId)) record.state = state;
                return { affected: 1 };
            }),
        });
        const accessRepository = repositoryFor(TokenType.ACCESS);
        const refreshRepository = repositoryFor(TokenType.REFRESH);
        tokenRepository = repositoryFor();
        const manager = { getRepository: (entity: unknown) => entity === UserEntity ? userRepository : entity === TokenAccessEntity ? accessRepository : entity === TokenRefreshEntity ? refreshRepository : tokenRepository };
        // Serial transaction fixture models the user row lock; failed transactions roll back all token writes.
        let transactionTail = Promise.resolve();
        const transaction = jest.fn(callback => {
            const result = transactionTail.then(async () => {
                const snapshot = records.map(record => ({ ...record }));
                try { return await callback(manager); } catch (error) { records = snapshot; throw error; }
            });
            transactionTail = result.then(() => undefined, () => undefined);
            return result;
        });
        const dataSource = { getRepository: manager.getRepository, dataSource: { transaction } } as unknown as DataSourceService;
        service = new TokenService(jwt, dataSource);
        userService = new UserService(dataSource, service);
    });

    it('issues distinct signed tokens with aligned expirations and stores only SHA-256 hashes', async () => {
        const pair = await service.createSession(user.id);
        const access = jwt.verify(pair.access);
        const refresh = jwt.verify(pair.refresh);
        expect(access.kind).toBe(TokenType.ACCESS);
        expect(refresh.kind).toBe(TokenType.REFRESH);
        expect(access.sid).toBe(refresh.sid);
        expect(access.jti).not.toBe(refresh.jti);
        expect(access.exp - access.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
        expect(refresh.exp - refresh.iat).toBeGreaterThanOrEqual(REFRESH_TOKEN_TTL_SECONDS - 2);
        expect(records[0].expiredAt.valueOf()).toBe(access.exp * 1000);
        expect(records[1].expiredAt.valueOf()).toBe(refresh.exp * 1000);
        expect(records.map(record => record.value)).toEqual([pair.access, pair.refresh].map(value => createHash('sha256').update(value).digest('hex')));
        expect(userRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
    });

    it.each(['bad-token', '', undefined, null])('rejects malformed bearer token %s without throwing', async token => {
        await expect(service.getUserByAccessToken(token)).resolves.toBeNull();
        await expect(service.rotateRefreshToken(token)).resolves.toBeNull();
    });

    it('rejects wrong signatures, wrong token kinds, standard expiration, and unsupported algorithms', async () => {
        const pair = await service.createSession(user.id);
        const payload = jwt.decode(pair.access);
        delete payload.iat; delete payload.exp; delete payload.aud; delete payload.iss;
        const expired = jwt.sign(payload, { expiresIn: -1 });
        const forged = new JwtService({ secret: 'different-secret' }).sign(payload);
        const wrongAlgorithm = jwt.sign(payload, { algorithm: 'HS384' });
        for (const token of [pair.refresh, expired, forged, wrongAlgorithm]) {
            await expect(service.getUserByAccessToken(token)).resolves.toBeNull();
        }
        await expect(service.rotateRefreshToken(pair.access)).resolves.toBeNull();
    });

    it('rejects revoked access tokens and inactive users', async () => {
        const pair = await service.createSession(user.id);
        await expect(service.getUserByAccessToken(pair.access)).resolves.toMatchObject({ id: user.id });
        records[0].state = ModelState.INACTIVE;
        await expect(service.getUserByAccessToken(pair.access)).resolves.toBeNull();
        records[0].state = ModelState.ACTIVE;
        user.state = ModelState.INACTIVE;
        await expect(service.getUserByAccessToken(pair.access)).resolves.toBeNull();
        await expect(service.rotateRefreshToken(pair.refresh)).resolves.toBeNull();
        await expect(service.createSession(user.id)).resolves.toBeNull();
    });

    it('refreshes after access expiration and rotates the refresh token', async () => {
        const pair = await service.createSession(user.id);
        records[0].expiredAt = new Date(0);
        const rotated = await service.rotateRefreshToken(pair.refresh);
        expect(rotated.refresh).not.toBe(pair.refresh);
        expect(rotated.refreshExpiredAt.valueOf()).toBeLessThanOrEqual(pair.refreshExpiredAt.valueOf());
        expect(records[1].state).toBe(ModelState.INACTIVE);
        await expect(service.getUserByAccessToken(rotated.access)).resolves.toMatchObject({ id: user.id });
    });

    it('revokes all generations of the session on refresh token replay', async () => {
        const pair = await service.createSession(user.id);
        const rotated = await service.rotateRefreshToken(pair.refresh);
        await expect(service.rotateRefreshToken(pair.refresh)).resolves.toBeNull();
        await expect(service.getUserByAccessToken(rotated.access)).resolves.toBeNull();
        await expect(service.rotateRefreshToken(rotated.refresh)).resolves.toBeNull();
    });

    it('logs out using an old rotated refresh token and preserves other sessions', async () => {
        const first = await service.createSession(user.id);
        const second = await service.createSession(user.id);
        const rotated = await service.rotateRefreshToken(first.refresh);
        await service.revokeSession(first.refresh);
        await expect(service.getUserByAccessToken(first.access)).resolves.toBeNull();
        await expect(service.getUserByAccessToken(rotated.access)).resolves.toBeNull();
        await expect(service.getUserByAccessToken(second.access)).resolves.toMatchObject({ id: user.id });
        await expect(service.revokeSession('invalid')).resolves.toBeUndefined();
    });

    it('serializes concurrent refresh and logout without leaving a valid session', async () => {
        const pair = await service.createSession(user.id);
        const [rotated] = await Promise.all([service.rotateRefreshToken(pair.refresh), service.revokeSession(pair.refresh)]);
        await expect(service.getUserByAccessToken(rotated.access)).resolves.toBeNull();
    });

    it('rolls back rotation when issuing the new pair fails', async () => {
        const pair = await service.createSession(user.id);
        failSave = true;
        await expect(service.rotateRefreshToken(pair.refresh)).rejects.toThrow('Database save failed');
        failSave = false;
        await expect(service.rotateRefreshToken(pair.refresh)).resolves.toHaveProperty('access');
    });

    it('returns the same sign-in error for unknown email, wrong password, and inactive users', async () => {
        const signIn = (email: string, password: string) => userService.signIn(email, password);
        const expected = { response: { code: 'INVALID_CREDENTIALS' }, status: 401 };
        await expect(signIn('unknown@example.com', 'Password123!')).rejects.toMatchObject(expected);
        await expect(signIn(user.email, 'wrong-password')).rejects.toMatchObject(expected);
        user.state = ModelState.INACTIVE;
        await expect(signIn(user.email, 'Password123!')).rejects.toMatchObject(expected);
    });

    it('signs in an active user and returns only allowlisted profile fields', async () => {
        await expect(userService.signIn(user.email, 'Password123!')).resolves.toHaveProperty('access');
        Object.assign(user, { access: records, refresh: records, ownPatterns: [] });
        const profile = await userService.getUser(user.id);
        expect(profile).toMatchObject({ id: user.id, email: user.email, role: UserRole.COMMON });
        expect(profile).not.toHaveProperty('passwordHash');
        expect(profile).not.toHaveProperty('access');
        expect(profile).not.toHaveProperty('refresh');
        expect(profile).not.toHaveProperty('state');
    });

    it.each(['Password123!', 'invalid-user-password'])('rejects passwordless accounts even with %s', async password => {
        user.passwordHash = null;

        await expect(userService.signIn(user.email, password)).rejects.toMatchObject({
            response: { code: 'INVALID_CREDENTIALS' }, status: 401,
        });
        expect(records).toHaveLength(0);
    });
});
