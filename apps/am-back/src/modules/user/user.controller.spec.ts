import { INestApplication, Module } from '@nestjs/common';
import { Reflector, RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RolesGuard } from '../../core/guards/role.guard';
import { UserService } from '../../db/services/user.service';
import { CategoriesService } from '../../db/services/patterns/categories.service';
import { CategoriesController } from '../categories/categories.controller';
import { UserController } from './user.controller';
import { AuthEmailThrottleGuard, AuthThrottleGuard, SessionRequestGuard } from './session-http';
import { UserRole } from '../../db/entities/user.entity';
import { EmailLoginService } from '../../db/services/email-login.service';
import { AuthEmailService } from '../../db/services/auth-email.service';
import { AuthEmailLimitService } from '../../db/services/auth-email-limit.service';

@Module({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
    controllers: [UserController],
    providers: [AuthThrottleGuard, SessionRequestGuard, AuthEmailThrottleGuard,
        { provide: UserService, useValue: {} }, { provide: EmailLoginService, useValue: {} },
        { provide: AuthEmailService, useValue: {} }, { provide: AuthEmailLimitService, useValue: {} }],
})
class TestUserModule {}

describe('authentication HTTP contract', () => {
    let app: INestApplication;
    const users = { signIn: jest.fn(), refreshToken: jest.fn(), logout: jest.fn(), getUserByEmail: jest.fn(), creatUser: jest.fn(), getUser: jest.fn() };
    const categories = { editCategory: jest.fn() };
    const emailLogin = { signIn: jest.fn() };
    const authEmail = { requestLogin: jest.fn(), requestRegistration: jest.fn() };
    const limits = { consume: jest.fn() };
    const base = '/api/user/user';

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [TestUserModule, RouterModule.register([{ path: 'user', module: TestUserModule }])],
            controllers: [CategoriesController],
            providers: [{ provide: CategoriesService, useValue: categories }],
        }).overrideProvider(UserService).useValue(users).overrideProvider(EmailLoginService).useValue(emailLogin)
            .overrideProvider(AuthEmailService).useValue(authEmail).overrideProvider(AuthEmailLimitService).useValue(limits).compile();
        app = module.createNestApplication();
        app.setGlobalPrefix('api');
        app.use((req, _res, next) => {
            if (req.headers['test-user-role']) req.user = { id: 1, role: req.headers['test-user-role'] };
            next();
        });
        const reflector = app.get(Reflector);
        app.useGlobalGuards(new RolesGuard(reflector), new AuthGuard(reflector));
        await app.listen(0, '127.0.0.1');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
        users.signIn.mockResolvedValue({ access: 'access-value', refresh: 'refresh-value', refreshExpiredAt: new Date(Date.now() + 100_000) });
        users.refreshToken.mockResolvedValue({ access: 'new-access', refresh: 'new-refresh', refreshExpiredAt: new Date(Date.now() + 100_000) });
        users.getUserByEmail.mockResolvedValue(null);
        users.creatUser.mockResolvedValue({ id: 1 });
        categories.editCategory.mockResolvedValue({ id: 1 });
        authEmail.requestLogin.mockResolvedValue(undefined);
        authEmail.requestRegistration.mockResolvedValue(undefined);
        limits.consume.mockResolvedValue(0);
        emailLogin.signIn.mockResolvedValue({ access: 'email-access', refresh: 'email-refresh', refreshExpiredAt: new Date(Date.now() + 100_000), redirectPath: '/account/orders/42' });
    });

    afterAll(async () => { await app.close(); });

    it('returns an access token and an HttpOnly SameSite cookie without exposing refresh in JSON', async () => {
        const response = await request(app.getHttpServer()).post(base + '/sign-in')
            .set('X-CSRF-Protection', '1').send({ email: ' USER@example.com ', password: 'Password123!' }).expect(200);
        expect(response.body).toEqual({ access: 'access-value' });
        expect(response.headers['cache-control']).toBe('no-store');
        const cookie = response.headers['set-cookie'][0];
        expect(cookie).toContain('am_refresh=refresh-value');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Strict');
        expect(cookie).toContain('Path=/api/user/user');
        expect(users.signIn).toHaveBeenCalledWith('user@example.com', 'Password123!');
    });

    it('uses Secure cookies outside development and tests', async () => {
        const previous = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'production';
            const response = await request(app.getHttpServer()).post(base + '/sign-in')
                .set('X-CSRF-Protection', '1').send({ email: 'user@example.com', password: 'Password123!' }).expect(200);
            expect(response.headers['set-cookie'][0]).toContain('Secure');
        } finally { process.env.NODE_ENV = previous; }
    });

    it('refreshes without an access token, using only the cookie', async () => {
        const response = await request(app.getHttpServer()).post(base + '/refresh')
            .set('X-CSRF-Protection', '1').set('Cookie', 'am_refresh=refresh-value').expect(200);
        expect(users.refreshToken).toHaveBeenCalledWith('refresh-value');
        expect(response.body).toEqual({ access: 'new-access' });
        expect(response.headers['set-cookie'][0]).toContain('am_refresh=new-refresh');
    });

    it('clears an invalid refresh cookie and returns the standard 401 error', async () => {
        users.refreshToken.mockResolvedValueOnce(null);
        const response = await request(app.getHttpServer()).post(base + '/refresh').set('X-CSRF-Protection', '1').expect(401);
        expect(response.body).toEqual({ code: 'EXPIRED' });
        expect(response.headers['set-cookie'][0]).toContain('am_refresh=;');
    });

    it('logs out without a live access token and clears the cookie', async () => {
        const response = await request(app.getHttpServer()).post(base + '/logout')
            .set('X-CSRF-Protection', '1').set('Cookie', 'am_refresh=old-refresh').expect(204);
        expect(users.logout).toHaveBeenCalledWith('old-refresh');
        expect(response.headers['set-cookie'][0]).toContain('am_refresh=;');
    });

    it.each(['/register', '/sign-in', '/refresh', '/logout', '/email-login/request', '/email-login/consume'])('rejects CSRF attempts to %s', async path => {
        await request(app.getHttpServer()).post(base + path).send({}).expect(403);
        await request(app.getHttpServer()).post(base + path).set('X-CSRF-Protection', '1').set('Sec-Fetch-Site', 'cross-site').send({}).expect(403);
        expect(users.signIn).not.toHaveBeenCalled();
        expect(users.refreshToken).not.toHaveBeenCalled();
        expect(users.logout).not.toHaveBeenCalled();
        expect(users.creatUser).not.toHaveBeenCalled();
        expect(authEmail.requestLogin).not.toHaveBeenCalled();
        expect(authEmail.requestRegistration).not.toHaveBeenCalled();
        expect(emailLogin.signIn).not.toHaveBeenCalled();
    });

    it('requests an email link using the normalized email and returns no account information', async () => {
        const response = await request(app.getHttpServer()).post(base + '/email-login/request')
            .set('X-CSRF-Protection', '1').send({ email: ' Buyer@Example.com ', redirectPath: '/account/orders/42' }).expect(204);
        expect(response.text).toBe('');
        expect(authEmail.requestLogin).toHaveBeenCalledWith('buyer@example.com', '/account/orders/42');
        expect(limits.consume).toHaveBeenCalledWith('buyer@example.com', expect.any(String));
    });

    it.each([{}, { email: 'bad' }, { email: [] }])('rejects an invalid email link request %j', async body => {
        await request(app.getHttpServer()).post(base + '/email-login/request')
            .set('X-CSRF-Protection', '1').send(body).expect(400);
        expect(authEmail.requestLogin).not.toHaveBeenCalled();
    });

    it('exchanges a link for a session cookie and access token without exposing refresh in JSON', async () => {
        const response = await request(app.getHttpServer()).post(base + '/email-login/consume')
            .set('X-CSRF-Protection', '1').send({ token: 'opaque-token' }).expect(200);
        expect(response.body).toEqual({ access: 'email-access', redirectPath: '/account/orders/42' });
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.headers['set-cookie'][0]).toContain('am_refresh=email-refresh;');
        expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it.each([{}, { email: [], password: {} }, { email: 'invalid', password: '123' }, { email: 'u@example.com', password: 'x'.repeat(1025) }])(
        'rejects invalid credentials before accessing the user service: %j', async body => {
            await request(app.getHttpServer()).post(base + '/sign-in').set('X-CSRF-Protection', '1').send(body).expect(400);
            expect(users.signIn).not.toHaveBeenCalled();
        },
    );

    it('accepts consecutive registrations without returning user IDs or creating accounts synchronously', async () => {
        for (let index = 0; index < 2; index++) {
            await request(app.getHttpServer()).post(base + '/register').set('X-CSRF-Protection', '1')
                .send({ email: 'u' + index + '@example.com', password: 'Password123!', role: 'admin' }).expect(204);
        }
        expect(authEmail.requestRegistration).toHaveBeenCalledTimes(2);
        expect(authEmail.requestRegistration).toHaveBeenLastCalledWith('u1@example.com', 'Password123!');
        expect(users.getUserByEmail).not.toHaveBeenCalled();
        expect(users.creatUser).not.toHaveBeenCalled();
    });

    it.each(['/register', '/email-login/request'])('returns an identical empty response for all account states at %s', async path => {
        const responses = [];
        for (const account of [null, { state: 'active' }, { state: 'inactive' }]) {
            users.getUserByEmail.mockResolvedValue(account);
            const response = await request(app.getHttpServer()).post(base + path).set('X-CSRF-Protection', '1')
                .send({ email: 'Buyer@Example.com', password: 'Password123!' }).expect(204);
            responses.push({ status: response.status, body: response.text });
        }
        expect(responses).toEqual(Array(3).fill({ status: 204, body: '' }));
        expect(users.getUserByEmail).not.toHaveBeenCalled();
    });

    it.each(['/register', '/email-login/request'])('applies the shared email/IP limit at %s without accessing accounts', async path => {
        limits.consume.mockResolvedValue(60);
        const response = await request(app.getHttpServer()).post(base + path).set('X-CSRF-Protection', '1')
            .send({ email: ' Buyer@Example.com ', password: 'Password123!' }).expect(429);
        expect(response.body).toEqual({ code: 'TOO_MANY_REQUESTS' });
        expect(response.headers['retry-after']).toBe('60');
        expect(limits.consume).toHaveBeenCalledWith('buyer@example.com', expect.any(String));
        expect(authEmail.requestLogin).not.toHaveBeenCalled();
        expect(authEmail.requestRegistration).not.toHaveBeenCalled();
    });

    it('preserves sign-in compatibility for existing long passwords while rejecting them for registration', async () => {
        const password = 'Abc123!' + 'x'.repeat(70);
        await request(app.getHttpServer()).post(base + '/sign-in').set('X-CSRF-Protection', '1')
            .send({ email: 'legacy@example.com', password }).expect(200);
        expect(users.signIn).toHaveBeenCalledWith('legacy@example.com', password);
        await request(app.getHttpServer()).post(base + '/register').set('X-CSRF-Protection', '1')
            .send({ email: 'new@example.com', password }).expect(400);
        expect(users.creatUser).not.toHaveBeenCalled();
    });

    it('requires authentication for the profile', async () => {
        await request(app.getHttpServer()).get(base + '/profile').expect(401);
        expect(users.getUser).not.toHaveBeenCalled();
    });

    it('allows category editing only for authenticated administrators', async () => {
        const url = '/api/categories/edit/1';
        await request(app.getHttpServer()).patch(url).send({ ru: 'new' }).expect(401);
        await request(app.getHttpServer()).patch(url).set('test-user-role', UserRole.COMMON).send({ ru: 'new' }).expect(403);
        expect(categories.editCategory).not.toHaveBeenCalled();
        await request(app.getHttpServer()).patch(url).set('test-user-role', UserRole.ADMIN).send({ ru: 'new' }).expect(200);
        expect(categories.editCategory).toHaveBeenCalledTimes(1);
    });

    it('limits sign-in attempts with a consistent API error', async () => {
        let limited = false;
        for (let index = 0; index < 11; index++) {
            const response = await request(app.getHttpServer()).post(base + '/sign-in').set('X-CSRF-Protection', '1')
                .send({ email: 'user@example.com', password: 'wrong' });
            if (response.status === 429) {
                expect(response.body).toEqual({ code: 'TOO_MANY_REQUESTS' });
                expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
                limited = true;
                break;
            }
        }
        expect(limited).toBe(true);
    });
});
