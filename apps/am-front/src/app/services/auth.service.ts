import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { catchError, defer, finalize, firstValueFrom, from, map, Observable, of, shareReplay, Subject, takeUntil, throwError, timeout } from 'rxjs';
import { ApiUserProducer, UserTokensDTO } from '@am-front/root/api-v2';
import { isLocalPath } from '@ameralds/utils';

const LOGGED_OUT_KEY = 'am_logged_out';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private userProducer = inject(ApiUserProducer);
    private router = inject(Router);
    private refreshRequest: Observable<string> | null = null;
    private sessionChanges = new Subject<void>();
    private sessionVersion = 0;

    public readonly auth = signal(false);
    public readonly token = signal<string | null>(null);

    public get sessionRevision(): number {
        return this.sessionVersion;
    }

    constructor() {
        // Токены старой версии приложения больше не должны оставаться в хранилище браузера.
        try {
            for (const key of ['accessToken', 'refreshToken', 'user_status']) {
                localStorage.removeItem(key);
            }
        } catch { /* Storage может быть недоступен в приватном режиме. */ }
    }

    public async initialize(): Promise<void> {
        try {
            if (localStorage.getItem(LOGGED_OUT_KEY)) {
                return;
            }
        } catch { /* Сессия всё ещё может быть восстановлена через cookie. */ }
        await firstValueFrom(this.refreshAccessToken().pipe(catchError(() => of(null))));
    }

    public setToken(tokens: UserTokensDTO): void {
        this.sessionChanges.next();
        this.sessionVersion++;
        this.setAuthToken(tokens.access);
        try { localStorage.removeItem(LOGGED_OUT_KEY); } catch { /* Storage недоступен. */ }
    }

    public requestEmailLogin(email: string, redirectPath?: string): Observable<void> {
        return this.userProducer.userControllerRequestEmailLogin({ email, redirectPath });
    }

    public signInWithEmailLink(token: string): Observable<string> {
        const version = this.sessionVersion;
        // Сначала завершаем HTTP-подписку: setToken уведомляет об изменении сессии.
        return defer(() => from(firstValueFrom(this.withSessionLock(() => version === this.sessionVersion
            ? this.userProducer.userControllerSignInByEmail({ token }).pipe(takeUntil(this.sessionChanges))
            : throwError(() => new Error('The session has changed')))))).pipe(
            map(result => {
                if (version !== this.sessionVersion) {
                    throw new Error('The session has changed');
                }
                this.setToken(result);
                return isLocalPath(result.redirectPath) ? result.redirectPath : '/account/profile';
            }),
        );
    }

    private setAuthToken(token: string): void {
        const payload = jwtDecode<{ exp: number }>(token);
        if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
            throw new Error('The access token has expired');
        }
        this.token.set(token);
        this.auth.set(true);
    }

    private clearSession(): void {
        this.sessionVersion++;
        this.token.set(null);
        this.auth.set(false);
    }

    public logout(): void {
        this.sessionChanges.next();
        this.clearSession();
        try { localStorage.setItem(LOGGED_OUT_KEY, '1'); } catch { /* Storage недоступен. */ }
        void this.router.navigate(['/']);
    }

    public deleteToken(): void {
        this.logout();
        // Локальный выход выполняется и при недоступности сервера.
        this.withSessionLock(() => this.userProducer.userControllerLogout()).subscribe({ error: () => undefined });
    }

    private withSessionLock<T>(request: () => Observable<T>): Observable<T> {
        return defer(() => navigator.locks
            ? from(navigator.locks.request('ameralds-session', () => firstValueFrom(request())))
            : request());
    }

    public refreshAccessToken(): Observable<string> {
        if (this.refreshRequest) {
            return this.refreshRequest;
        }
        const version = this.sessionVersion;
        const request = this.withSessionLock(() => version === this.sessionVersion
            ? this.userProducer.userControllerRefresh().pipe(timeout(10_000), takeUntil(this.sessionChanges))
            : throwError(() => new Error('The session has changed')))
            .pipe(
                map(tokens => {
                    if (version !== this.sessionVersion) {
                        throw new Error('The session has changed');
                    }
                    this.setAuthToken(tokens.access);
                    return tokens.access;
                }),
                catchError(error => {
                    if (version === this.sessionVersion) {
                        this.clearSession();
                    }
                    return throwError(() => error);
                }),
                finalize(() => {
                    if (this.refreshRequest === request) {
                        this.refreshRequest = null;
                    }
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        this.refreshRequest = request;
        return request;
    }
}
