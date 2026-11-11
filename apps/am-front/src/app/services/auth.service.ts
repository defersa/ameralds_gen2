import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { catchError, defer, finalize, firstValueFrom, from, map, Observable, of, shareReplay, Subject, takeUntil, throwError, timeout } from 'rxjs';
import { ApiUserProducer, PasswordResetDto, UserTokensDTO } from '@am-front/root/api-v2';
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

    /** Запрашивает письмо установки пароля без проверки текущей сессии; ответ не раскрывает наличие аккаунта. */
    public requestPasswordReset(email: string): Observable<void> {
        return this.userProducer.userControllerRequestPasswordReset({ email: email.trim().toLowerCase() });
    }

    /** Проверяет возможность показать форму по токену, не изменяя текущую сессию и не выполняя refresh при отказе. */
    public validatePasswordReset(token: string): Observable<void> {
        return this.userProducer.userControllerValidatePasswordReset({ token });
    }

    /**
     * Меняет пароль только по токену ссылки, последовательно с refresh и cookie-операциями других вкладок.
     * После завершения HTTP-подписки очищает местную авторизацию, сохраняя экран успеха; ошибку передаёт форме.
     */
    public resetPassword(body: PasswordResetDto): Observable<void> {
        return defer(() => from(firstValueFrom(this.withSessionLock(() => this.userProducer.userControllerResetPassword(body)))))
            .pipe(map(() => this.clearAfterPasswordReset()));
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

    /** Очищает местную авторизацию; явный выход меняет ревизию, а ошибка refresh сохраняет её для обработки вызывающим interceptor. */
    private clearSession(invalidateRequests = true): void {
        if (invalidateRequests) {
            this.sessionVersion++;
        }

        this.token.set(null);
        this.auth.set(false);
    }

    /** Очищает авторизацию после смены пароля, отменяет refresh и сохраняет текущий экран успеха; cookie очищает ответ API. */
    public clearAfterPasswordReset(): void {
        this.sessionChanges.next();
        this.clearSession();

        try {
            localStorage.setItem(LOGGED_OUT_KEY, '1');
        } catch { /* Состояние страницы очищается и при недоступном Storage. */ }
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

    /** Объединяет параллельные refresh и отклоняет ответы прежней сессии; при ошибке очищает авторизацию без навигации. */
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
                        this.clearSession(false);
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
