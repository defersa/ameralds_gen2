import { inject } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';

export function AuthInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    const url = new URL(request.url, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
        return next(request);
    }
    const auth = inject(AuthService);
    const token = auth.token();
    const sessionRevision = auth.sessionRevision;
    const sessionRequest = /^\/api\/user\/user\/(sign-in|register|refresh|logout|email-login\/(request|consume))$/.test(url.pathname);
    let authenticated = request.clone({ withCredentials: true });
    if (sessionRequest && request.method === 'POST') {
        authenticated = authenticated.clone({ setHeaders: { 'X-CSRF-Protection': '1' } });
    } else if (token) {
        authenticated = authenticated.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
    }
    return next(authenticated).pipe(catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || sessionRequest || !token || !auth.auth() || sessionRevision !== auth.sessionRevision) {
            return throwError(() => error);
        }
        const retry = (access: string) => next(authenticated.clone({ setHeaders: { Authorization: 'Bearer ' + access } })).pipe(
            catchError((retryError: HttpErrorResponse) => {
                if (retryError.status === 401) {
                    auth.logout();
                }
                return throwError(() => retryError);
            }),
        );
        const currentToken = auth.token();
        if (currentToken && currentToken !== token) {
            return retry(currentToken);
        }
        return auth.refreshAccessToken().pipe(
            catchError(refreshError => {
                auth.logout();
                return throwError(() => refreshError);
            }),
            switchMap(retry),
        );
    }));
}
