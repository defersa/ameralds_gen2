import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSourceService } from '../data-source.service';
import { ModelState } from '../abstract/abstract.model';
import { UserEntity } from '../entities/user.entity';
import { AuthEmailRequestEntity, AuthEmailRequestKind } from '../entities/tokens/auth-email-request.entity';
import { AuthEmailService } from './auth-email.service';
import { EmailLoginService } from './email-login.service';
import { UserService } from './user.service';
import { MailService } from '../../mail/mail.service';

jest.mock('../../mail/mail-assets', () => ({ getMailLogo: jest.fn().mockResolvedValue({ filename: 'logo.png' }) }));

describe('background authentication emails', () => {
    let service: AuthEmailService;
    let job: AuthEmailRequestEntity;
    let user: UserEntity;
    let query: Record<string, jest.Mock>;
    let repository: { create: jest.Mock; save: jest.Mock; delete: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
    let users: { getUserByEmail: jest.Mock };
    let links: { createLink: jest.Mock; createRegistrationLink: jest.Mock };
    let mail: { send: jest.Mock };

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        user = Object.assign(new UserEntity(), { id: 42, state: ModelState.ACTIVE, passwordHash: null, email: 'buyer@example.com' });
        job = Object.assign(new AuthEmailRequestEntity(), {
            id: 7, kind: AuthEmailRequestKind.LOGIN, email: user.email, passwordHash: null,
            createdAt: new Date(), availableAt: new Date(), attempts: 0, redirectPath: '/account/orders/17',
        });
        query = Object.fromEntries(['addSelect', 'where', 'orderBy', 'addOrderBy', 'take', 'setLock', 'setOnLocked'].map(key => [key, jest.fn().mockReturnThis()]));
        query.getOne = jest.fn().mockResolvedValueOnce(job).mockResolvedValue(null);
        repository = {
            create: jest.fn(details => Object.assign(new AuthEmailRequestEntity(), details)), save: jest.fn(async entity => entity),
            delete: jest.fn().mockResolvedValue({ affected: 1 }), update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn(() => query),
        };
        users = { getUserByEmail: jest.fn().mockResolvedValue(user) };
        links = { createLink: jest.fn().mockResolvedValue('https://shop.example/auth/email#token=login'), createRegistrationLink: jest.fn().mockResolvedValue('https://shop.example/auth/email#token=registration') };
        mail = { send: jest.fn().mockResolvedValue(undefined) };
        service = new AuthEmailService({
            getRepository: jest.fn(() => repository),
            dataSource: { transaction: async callback => callback({ getRepository: () => repository }) },
        } as unknown as DataSourceService, links as unknown as EmailLoginService, users as unknown as UserService, mail as unknown as MailService);
    });
    afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

    it.each(['active', 'unknown', 'inactive'])('only enqueues the HTTP request for an %s account', async state => {
        users.getUserByEmail.mockResolvedValue(state === 'unknown' ? null : { ...user, state });
        await expect(service.requestLogin(' Buyer@Example.com ', '/account/orders/17')).resolves.toBeUndefined();
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            email: user.email, kind: AuthEmailRequestKind.LOGIN, passwordHash: null, redirectPath: '/account/orders/17',
        }));
        expect(users.getUserByEmail).not.toHaveBeenCalled();
        expect(mail.send).not.toHaveBeenCalled();
        expect(links.createLink).not.toHaveBeenCalled();
    });

    it('hashes the registration password without looking up accounts or storing plaintext', async () => {
        await service.requestRegistration(user.email, 'Password123!');
        const record = repository.save.mock.calls[0][0];
        expect(record.kind).toBe(AuthEmailRequestKind.REGISTRATION);
        expect(await bcrypt.compare('Password123!', record.passwordHash)).toBe(true);
        expect(JSON.stringify(record)).not.toContain('Password123!');
        expect(users.getUserByEmail).not.toHaveBeenCalled();
        expect(mail.send).not.toHaveBeenCalled();
    });

    it('rejects an unsafe redirect before enqueuing', async () => {
        await expect(service.requestLogin(user.email, '//external.example')).rejects.toMatchObject({ status: 400 });
        expect(repository.save).not.toHaveBeenCalled();
    });

    it.each(['short', 'Abc123!' + 'x'.repeat(70)])('rejects an invalid registration password before enqueuing', async password => {
        await expect(service.requestRegistration(user.email, password)).rejects.toMatchObject({ status: 400 });
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('claims and leases a job before sending, then deletes only its own lease', async () => {
        await service.processPendingRequests();
        expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
        expect(query.setOnLocked).toHaveBeenCalledWith('skip_locked');
        expect(query.take).toHaveBeenCalledWith(1);
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1, leaseToken: expect.any(String) }));
        expect(links.createLink).toHaveBeenCalledWith(42, '/account/orders/17');
        expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: user.email, text: expect.stringContaining('7 дней') }));
        expect(repository.delete).toHaveBeenCalledWith({ id: job.id, leaseToken: job.leaseToken });
    });

    it.each(['unknown', 'inactive'])('discards login requests for an %s account only in the worker', async condition => {
        users.getUserByEmail.mockResolvedValue(condition === 'unknown' ? null : { ...user, state: ModelState.INACTIVE });
        await service.processPendingRequests();
        expect(mail.send).not.toHaveBeenCalled();
        expect(links.createLink).not.toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalledWith({ id: job.id, leaseToken: job.leaseToken });
    });

    it('sends a confirmation for an unknown registration without creating the user', async () => {
        job.kind = AuthEmailRequestKind.REGISTRATION;
        job.passwordHash = '$2b$10$' + 'a'.repeat(53);
        users.getUserByEmail.mockResolvedValue(null);
        await service.processPendingRequests();
        expect(links.createRegistrationLink).toHaveBeenCalledWith(job.email, job.passwordHash);
        expect(links.createLink).not.toHaveBeenCalled();
        expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Подтвердите регистрацию в AMSTORE' }));
    });

    it('sends an ordinary login link for an existing registration without changing credentials', async () => {
        job.kind = AuthEmailRequestKind.REGISTRATION;
        job.passwordHash = 'new-hash';
        await service.processPendingRequests();
        expect(links.createRegistrationLink).not.toHaveBeenCalled();
        expect(links.createLink).toHaveBeenCalledWith(user.id, job.redirectPath);
        expect(user.passwordHash).toBeNull();
    });

    it('retries SMTP failures with backoff and never logs email, token or the SMTP exception', async () => {
        mail.send.mockRejectedValue(new Error(`SMTP ${user.email} secret-token`));
        const before = Date.now();
        await expect(service.processPendingRequests()).resolves.toBeUndefined();
        expect(repository.delete).not.toHaveBeenCalled();
        const retry = repository.update.mock.calls[0];
        expect(retry[0]).toEqual({ id: job.id, leaseToken: job.leaseToken });
        expect(retry[1].leaseToken).toBeNull();
        expect(retry[1].availableAt.valueOf()).toBeGreaterThanOrEqual(before + 60_000);
        expect(Logger.prototype.warn).toHaveBeenCalledWith('Auth email job 7 failed (attempt 1/5)');
    });

    it('removes credentials after the final failed attempt', async () => {
        job.attempts = 4;
        mail.send.mockRejectedValue(new Error('SMTP unavailable'));
        await service.processPendingRequests();
        expect(repository.delete).toHaveBeenCalledWith({ id: job.id, leaseToken: job.leaseToken });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it('discards expired jobs without sending mail', async () => {
        job.createdAt = new Date(Date.now() - 25 * 60 * 60_000);
        await service.processPendingRequests();
        expect(users.getUserByEmail).not.toHaveBeenCalled();
        expect(mail.send).not.toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalled();
    });

    it('reports missing migrations safely and backs off instead of polling a broken queue every second', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-10-28T12:00:00Z'));
        query.getOne.mockReset().mockRejectedValue({
            driverError: { code: '42P01' }, query: 'SELECT secret-token', parameters: [user.email], message: user.email,
        });
        await service.processPendingRequests();
        expect(Logger.prototype.error).toHaveBeenLastCalledWith(
            'Unable to process auth email queue (code: 42P01). Retrying in 5s. Database schema is outdated; run npm run am:back:typeorm:migration:run.',
        );
        await service.processPendingRequests();
        expect(query.getOne).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(5_000);
        await service.processPendingRequests();
        expect(query.getOne).toHaveBeenCalledTimes(2);
        expect(Logger.prototype.error).toHaveBeenLastCalledWith(expect.stringContaining('Retrying in 10s'));
        expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toMatch(/buyer@example.com|secret-token/);
        expect(mail.send).not.toHaveBeenCalled();
    });

    it('automatically recovers after the database becomes available and resets the retry delay', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-10-28T12:00:00Z'));
        query.getOne.mockReset().mockRejectedValueOnce({ code: 'ECONNREFUSED' }).mockResolvedValueOnce(null).mockRejectedValueOnce({ code: '08006' });
        await service.processPendingRequests();
        jest.advanceTimersByTime(5_000);
        await service.processPendingRequests();
        await service.processPendingRequests();
        expect(query.getOne).toHaveBeenCalledTimes(3);
        expect(Logger.prototype.error).toHaveBeenLastCalledWith('Unable to process auth email queue (code: 08006). Retrying in 5s.');
    });

    it('does not log arbitrary error codes or exception contents', async () => {
        query.getOne.mockReset().mockRejectedValue({ code: user.email, message: 'secret-token', stack: user.email });
        await service.processPendingRequests();
        expect(Logger.prototype.error).toHaveBeenCalledWith('Unable to process auth email queue (code: UNKNOWN). Retrying in 5s.');
    });

    it('does not run overlapping interval handlers in the same process', async () => {
        let complete: () => void;
        mail.send.mockImplementation(() => new Promise<void>(resolve => { complete = resolve; }));
        const first = service.processPendingRequests();
        while (!complete) await Promise.resolve();
        await service.processPendingRequests();
        expect(query.getOne).toHaveBeenCalledTimes(1);
        complete();
        await first;
        expect(mail.send).toHaveBeenCalledTimes(1);
    });
});
