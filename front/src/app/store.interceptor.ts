import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './services/auth.service';


const UNAUTHORIZED_STATUS = 401;

@Injectable()
export class StoreInterceptor implements HttpInterceptor {

    constructor(
        private authService: AuthService
    ) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        const token: string = this.authService.token$.getValue();

        if (token) {
            const cloned = request.clone({
                headers: request.headers.set("Authorization",
                    "JWT " + token)
            });

            return next.handle(cloned)
                .pipe(tap(this.getResponseTap()));
        }
        else {
            return next.handle(request);
        }
    }

    private getResponseTap(): (response: HttpEvent<unknown>) => void {
        return (response: HttpEvent<unknown>) => {
            if (response instanceof HttpResponse) {
                if (response.status === UNAUTHORIZED_STATUS) {
                    this.authService.logout();
                }
            }
        }
    }
}
