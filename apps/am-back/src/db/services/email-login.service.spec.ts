import { createHash } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { ModelState } from '../abstract/abstract.model';
import { DataSourceService } from '../data-source.service';
import { UserEntity } from '../entities/user.entity';
import { EmailLoginLinkEntity } from '../entities/tokens/email-login-link.entity';
import { TokenService } from './token.service';
import { UserService } from './user.service';
import { EMAIL_LOGIN_TTL_MS, EmailLoginService } from './email-login.service';

describe('email login links', () => {
    const token = 'a'.repeat(43);
    const previousSite = process.env.SITE_URL;
    let service: EmailLoginService;
    let user: UserEntity;
    let link: EmailLoginLinkEntity;
    let links: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
    let userRepository: { findOneBy: jest.Mock };
    let tokens: { hashToken: jest.Mock; createSession: jest.Mock };
    let users: { getOrCreateRegisteredUser: jest.Mock };
    let manager: EntityManager;

    beforeEach(() => {
        process.env.SITE_URL = 'https://shop.example';
        user = Object.assign(new UserEntity(), { id: 42, email: 'buyer@example.com', state: ModelState.ACTIVE, passwordHash: null });
        link = Object.assign(new EmailLoginLinkEntity(), {
            id: 9, user, state: ModelState.ACTIVE, expiredAt: new Date(Date.now() + 60_000), redirectPath: '/account/orders/17',
        });
        links = {
            findOne: jest.fn(async () => link), save: jest.fn(async entity => entity),
            create: jest.fn(details => Object.assign(new EmailLoginLinkEntity(), details)),
        };
        userRepository = { findOneBy: jest.fn(async () => user) };
        manager = { getRepository: jest.fn(() => links) } as unknown as EntityManager;
        tokens = {
            hashToken: jest.fn(value => createHash('sha256').update(value).digest('hex')),
            createSession: jest.fn().mockResolvedValue({ access: 'access', refresh: 'refresh', refreshExpiredAt: new Date(Date.now() + 90_000) }),
        };
        users = { getOrCreateRegisteredUser: jest.fn(async () => user) };
        service = new EmailLoginService({
            getRepository: entity => entity === UserEntity ? userRepository : links,
            dataSource: { transaction: async callback => {
                const state = link.state;
                try { return await callback(manager); } catch (error) { link.state = state; throw error; }
            } },
        } as unknown as DataSourceService, tokens as unknown as TokenService, users as unknown as UserService);
    });

    afterEach(() => {
        if (previousSite === undefined) delete process.env.SITE_URL;
        else process.env.SITE_URL = previousSite;
        jest.useRealTimers();
    });

    it('issues a random opaque token with exactly seven days of validity and stores only its hash', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-10-28T12:00:00Z'));
        const url = new URL(await service.createLink(user.id, '/account/orders/17'));
        const raw = new URLSearchParams(url.hash.slice(1)).get('token');
        expect(url.origin + url.pathname).toBe('https://shop.example/auth/email');
        expect(url.search).toBe('');
        expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
        const record = links.save.mock.calls[0][0];
        expect(record.tokenHash).toBe(createHash('sha256').update(raw).digest('hex'));
        expect(JSON.stringify(record)).not.toContain(raw);
        expect(record.expiredAt.valueOf() - Date.now()).toBe(EMAIL_LOGIN_TTL_MS);
        expect(record.redirectPath).toBe('/account/orders/17');
    });

    it('stores a pending registration without creating a user or storing a plaintext password', async () => {
        const passwordHash = '$2b$10$' + 'a'.repeat(53);
        const url = new URL(await service.createRegistrationLink(' BUYER@example.com ', passwordHash));
        expect(url.hash).toMatch(/^#token=[A-Za-z0-9_-]{43}$/);
        expect(links.save).toHaveBeenCalledWith(expect.objectContaining({
            registrationEmail: 'buyer@example.com', registrationPasswordHash: passwordHash, redirectPath: '/account/profile',
        }));
        expect(users.getOrCreateRegisteredUser).not.toHaveBeenCalled();
        expect(userRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('rejects registration links with an invalid password hash', async () => {
        await expect(service.createRegistrationLink(user.email, 'Password123!')).rejects.toThrow('Invalid registration password hash');
        expect(links.save).not.toHaveBeenCalled();
    });

    it('creates a confirmed account in the session transaction and removes pending credentials', async () => {
        link.user = null;
        link.registrationEmail = user.email;
        link.registrationPasswordHash = '$2b$10$' + 'a'.repeat(53);
        await expect(service.signIn(token)).resolves.toMatchObject({ access: 'access' });
        expect(users.getOrCreateRegisteredUser).toHaveBeenCalledWith(user.email, '$2b$10$' + 'a'.repeat(53), manager);
        expect(tokens.createSession).toHaveBeenCalledWith(user.id, manager);
        expect(link.user).toBe(user);
        expect(link.registrationEmail).toBeNull();
        expect(link.registrationPasswordHash).toBeNull();
        expect(link.state).toBe(ModelState.INACTIVE);
    });

    it('does not bypass an inactive account with a registration confirmation', async () => {
        link.user = null;
        link.registrationEmail = user.email;
        link.registrationPasswordHash = '$2b$10$' + 'a'.repeat(53);
        user.state = ModelState.INACTIVE;
        await expect(service.signIn(token)).rejects.toMatchObject({ status: 401 });
        expect(tokens.createSession).not.toHaveBeenCalled();
    });

    it.each(['https://external.example', '//external.example', '/\\external.example', '/%2f%2fexternal.example', '/x\ny'])('rejects unsafe destinations %s', async path => {
        await expect(service.createLink(user.id, path)).rejects.toMatchObject({ status: 400 });
        expect(links.save).not.toHaveBeenCalled();
    });

    it('consumes a link and creates an ordinary session in the same transaction', async () => {
        await expect(service.signIn(token)).resolves.toMatchObject({ access: 'access', refresh: 'refresh', redirectPath: '/account/orders/17' });
        expect(tokens.createSession).toHaveBeenCalledWith(user.id, manager);
        expect(links.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' }, relationLoadStrategy: 'query' }));
        expect(link.state).toBe(ModelState.INACTIVE);
        await expect(service.signIn(token)).rejects.toMatchObject({ status: 401, response: { code: 'EXPIRED' } });
        expect(tokens.createSession).toHaveBeenCalledTimes(1);
    });

    it.each(['expired', 'boundary', 'inactive user', 'missing user', 'missing link', 'invalid destination'])(
        'rejects %s without creating a session', async condition => {
            if (condition === 'expired') link.expiredAt = new Date(Date.now() - 1);
            if (condition === 'boundary') { jest.useFakeTimers(); link.expiredAt = new Date(); }
            if (condition === 'inactive user') user.state = ModelState.INACTIVE;
            if (condition === 'missing user') link.user = null;
            if (condition === 'missing link') links.findOne.mockResolvedValue(null);
            if (condition === 'invalid destination') link.redirectPath = '//external.example';
            await expect(service.signIn(token)).rejects.toMatchObject({ status: 401, response: { code: 'EXPIRED' } });
            expect(tokens.createSession).not.toHaveBeenCalled();
        },
    );

    it.each([null, undefined, '', 42, 'a'.repeat(44), '../token'])('rejects malformed token %s before a database query', async value => {
        await expect(service.signIn(value as string)).rejects.toMatchObject({ status: 401 });
        expect(links.findOne).not.toHaveBeenCalled();
    });

    it('keeps the link usable when creating a session fails', async () => {
        tokens.createSession.mockRejectedValue(new Error('Database unavailable'));
        await expect(service.signIn(token)).rejects.toThrow('Database unavailable');
        expect(link.state).toBe(ModelState.ACTIVE);
    });
});
