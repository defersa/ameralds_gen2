import { inject, Injectable } from "@angular/core";
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpResponse, HttpHandlerFn
} from "@angular/common/http";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuthService } from "./services/auth.service";


const UNAUTHORIZED_STATUS = 401;

export function AuthInterceptor(request: HttpRequest<Record<string, never>>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    const authService: AuthService = inject(AuthService);

    const token: string = authService.token$.getValue();
    const getResponseTap: () => (response: HttpEvent<unknown>) => void = () => {
        return (response: HttpEvent<unknown>) => {
            if (response instanceof HttpResponse) {
                if (response.status === UNAUTHORIZED_STATUS) {
                    this.authService.logout();
                }
            }
        };
    };

    if (token) {
        const cloned = request.clone({
            headers: request.headers.set("Authorization",
                "Bearer " + token)
        });

        return next(cloned)
            .pipe(tap(getResponseTap()));
    } else {
        return next(request);
    }
}
