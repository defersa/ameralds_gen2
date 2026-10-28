import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';
import { AuthInterceptor } from '../auth.interceptor';
import { provideApiClient } from '../api-client.providers';

function accessToken(name: string): string {
    return btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900, name })) + '.signature';
}

describe('browser authentication session', () => {
    let auth: AuthService;
    let http: HttpClient;
    let requests: HttpTestingController;
    const navigate = jest.fn().mockResolvedValue(true);
    const base = '/api/user/user';
    const oldToken = accessToken('old');
    const newToken = accessToken('new');

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        TestBed.configureTestingModule({ providers: [
            provideApiClient(), provideHttpClient(withInterceptors([AuthInterceptor])), provideHttpClientTesting(),
            { provide: Router, useValue: { navigate } },
        ] });
        http = TestBed.inject(HttpClient);
        requests = TestBed.inject(HttpTestingController);
    });

    afterEach(() => { requests.verify(); localStorage.clear(); });

    function login(): void {
        auth = TestBed.inject(AuthService);
        auth.setToken({ access: oldToken });
    }

    it('removes legacy tokens and roles instead of trusting localStorage', () => {
        localStorage.setItem('accessToken', 'untrusted');
        localStorage.setItem('refreshToken', 'secret');
        localStorage.setItem('user_status', 'admin');
        auth = TestBed.inject(AuthService);
        expect(auth.auth()).toBe(false);
        expect(auth.token()).toBeNull();
        for (const key of ['accessToken', 'refreshToken', 'user_status']) expect(localStorage.getItem(key)).toBeNull();
    });

    it('restores authentication through the cookie before application initialization completes', async () => {
        auth = TestBed.inject(AuthService);
        const initializing = auth.initialize();
        const request = requests.expectOne(base + '/refresh');
        expect(request.request.withCredentials).toBe(true);
        expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
        expect(request.request.headers.has('Authorization')).toBe(false);
        expect(request.request.body).toBeNull();
        request.flush({ access: newToken });
        await initializing;
        expect(auth.auth()).toBe(true);
        expect(auth.token()).toBe(newToken);
        expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('starts anonymously when the refresh cookie has expired', async () => {
        auth = TestBed.inject(AuthService);
        const initializing = auth.initialize();
        requests.expectOne(base + '/refresh').flush({ code: 'EXPIRED' }, { status: 401, statusText: 'Unauthorized' });
        await initializing;
        expect(auth.auth()).toBe(false);
    });

    it('shares one refresh among simultaneous 401 responses and retries both requests', () => {
        login();
        const first = jest.fn();
        const second = jest.fn();
        http.get('/api/first').subscribe(first);
        http.get('/api/second').subscribe(second);
        const originalFirst = requests.expectOne('/api/first');
        const originalSecond = requests.expectOne('/api/second');
        expect(originalFirst.request.headers.get('Authorization')).toBe('Bearer ' + oldToken);
        originalFirst.flush({}, { status: 401, statusText: 'Unauthorized' });
        originalSecond.flush({}, { status: 401, statusText: 'Unauthorized' });
        const refresh = requests.expectOne(base + '/refresh');
        refresh.flush({ access: newToken });
        for (const url of ['/api/first', '/api/second']) {
            const retry = requests.expectOne(url);
            expect(retry.request.headers.get('Authorization')).toBe('Bearer ' + newToken);
            retry.flush({ ok: true });
        }
        expect(first).toHaveBeenCalledWith({ ok: true });
        expect(second).toHaveBeenCalledWith({ ok: true });
        expect(auth.auth()).toBe(true);
    });

    it('reuses a token already refreshed by another request when a late 401 arrives', () => {
        login();
        http.get('/api/late').subscribe();
        const pending = requests.expectOne('/api/late');
        auth.refreshAccessToken().subscribe();
        requests.expectOne(base + '/refresh').flush({ access: newToken });
        pending.flush({}, { status: 401, statusText: 'Unauthorized' });
        const retry = requests.expectOne('/api/late');
        expect(retry.request.headers.get('Authorization')).toBe('Bearer ' + newToken);
        retry.flush({});
        requests.expectNone(base + '/refresh');
    });

    it('ends the session when refresh fails without entering a retry loop', () => {
        login();
        const error = jest.fn();
        http.get('/api/private').subscribe({ error });
        requests.expectOne('/api/private').flush({}, { status: 401, statusText: 'Unauthorized' });
        requests.expectOne(base + '/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
        expect(error).toHaveBeenCalledTimes(1);
        expect(auth.auth()).toBe(false);
        expect(navigate).toHaveBeenCalledWith(['/']);
        requests.expectNone('/api/private');
    });

    it('stops after a second unauthorized response', () => {
        login();
        const error = jest.fn();
        http.get('/api/private').subscribe({ error });
        requests.expectOne('/api/private').flush({}, { status: 401, statusText: 'Unauthorized' });
        requests.expectOne(base + '/refresh').flush({ access: newToken });
        requests.expectOne('/api/private').flush({}, { status: 401, statusText: 'Unauthorized' });
        expect(auth.auth()).toBe(false);
        expect(error).toHaveBeenCalledTimes(1);
        requests.expectNone(base + '/refresh');
    });

    it('preserves authentication on a forbidden response', () => {
        login();
        http.get('/api/admin').subscribe({ error: () => undefined });
        requests.expectOne('/api/admin').flush({}, { status: 403, statusText: 'Forbidden' });
        expect(auth.auth()).toBe(true);
        requests.expectNone(base + '/refresh');
    });

    it('does not restore a logged-out session when a late unauthorized response arrives', () => {
        login();
        const error = jest.fn();
        http.get('/api/pending').subscribe({ error });
        const pending = requests.expectOne('/api/pending');
        auth.logout();
        pending.flush({}, { status: 401, statusText: 'Unauthorized' });
        expect(auth.auth()).toBe(false);
        expect(error).toHaveBeenCalledTimes(1);
        requests.expectNone(base + '/refresh');
    });

    it('keeps credentials and bearer tokens away from third-party URLs', () => {
        login();
        http.get('https://external.example/api/data').subscribe();
        const request = requests.expectOne('https://external.example/api/data');
        expect(request.request.headers.has('Authorization')).toBe(false);
        expect(request.request.withCredentials).toBe(false);
        request.flush({});
    });

    it('clears the local session on logout even if the server is unavailable, and does not restore it on reload', async () => {
        login();
        auth.deleteToken();
        expect(auth.auth()).toBe(false);
        expect(auth.token()).toBeNull();
        requests.expectOne(base + '/logout').flush({}, { status: 503, statusText: 'Unavailable' });
        await auth.initialize();
        requests.expectNone(base + '/refresh');
        auth.setToken({ access: newToken });
        expect(localStorage.getItem('am_logged_out')).toBeNull();
    });

    it('cancels an in-flight refresh on logout', () => {
        login();
        auth.refreshAccessToken().subscribe();
        const pending = requests.expectOne(base + '/refresh');
        auth.logout();
        expect(pending.cancelled).toBe(true);
        expect(auth.auth()).toBe(false);
    });

    it('requests email login without a bearer token and with CSRF protection', () => {
        login();
        auth.requestEmailLogin('buyer@example.com', '/account/orders/17').subscribe();
        const request = requests.expectOne(base + '/email-login/request');
        expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
        expect(request.request.headers.has('Authorization')).toBe(false);
        expect(request.request.body).toEqual({ email: 'buyer@example.com', redirectPath: '/account/orders/17' });
        request.flush(null);
    });

    it('authenticates from a login link, clears the logout marker and returns the saved destination', async () => {
        auth = TestBed.inject(AuthService);
        localStorage.setItem('am_logged_out', '1');
        const destination = firstValueFrom(auth.signInWithEmailLink('opaque-token'));
        const request = requests.expectOne(base + '/email-login/consume');
        expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
        expect(request.request.body).toEqual({ token: 'opaque-token' });
        request.flush({ access: newToken, redirectPath: '/account/orders/17' });
        await expect(destination).resolves.toBe('/account/orders/17');
        expect(auth.auth()).toBe(true);
        expect(auth.token()).toBe(newToken);
        expect(localStorage.getItem('am_logged_out')).toBeNull();
    });

    it('preserves an existing session when a login link is invalid and never retries it using refresh', () => {
        login();
        auth.signInWithEmailLink('invalid').subscribe({ error: () => undefined });
        requests.expectOne(base + '/email-login/consume').flush({ code: 'EXPIRED' }, { status: 401, statusText: 'Unauthorized' });
        expect(auth.auth()).toBe(true);
        expect(auth.token()).toBe(oldToken);
        requests.expectNone(base + '/refresh');
    });

    it('falls back to the profile for an unsafe server destination', async () => {
        auth = TestBed.inject(AuthService);
        const destination = firstValueFrom(auth.signInWithEmailLink('opaque-token'));
        requests.expectOne(base + '/email-login/consume').flush({ access: newToken, redirectPath: '//external.example' });
        await expect(destination).resolves.toBe('/account/profile');
    });

    it('cancels email login on logout rather than restoring the session from a late response', () => {
        login();
        auth.signInWithEmailLink('opaque-token').subscribe({ error: () => undefined });
        const pending = requests.expectOne(base + '/email-login/consume');
        auth.logout();
        expect(pending.cancelled).toBe(true);
        expect(auth.auth()).toBe(false);
    });
});
