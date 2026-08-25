import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { IAuthResponse, IRefreshToken } from "@am-front/interface/profile.interface";
import { HttpErrorResponse } from "@angular/common/http";
import { LocalStorage } from "@am-front/decorators/local.decorator";
import { Router } from "@angular/router";
import { jwtDecode } from "jwt-decode";
import { ApiUserProducer } from "@am-front/root/api-v2";


const ACCESS_TOKEN_NAME: string = 'accessToken';
const REFRESH_TOKEN_NAME: string = 'refreshToken';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    @LocalStorage(ACCESS_TOKEN_NAME)
    private localAccessToken!: string;

    @LocalStorage(REFRESH_TOKEN_NAME)
    private localRefreshToken!: string;

    public accessExpiredAt(): Date {
        const expiredAt: string = this.localAccessToken ? jwtDecode<{ expiredAt: string }>(this.localAccessToken)?.expiredAt : null;

        return expiredAt ? new Date(expiredAt) : null;
    }

    public refreshExpiredAt(): Date {
        const expiredAt: string = this.localAccessToken ? jwtDecode<{ expiredAt: string }>(this.localRefreshToken)?.expiredAt : null;

        return expiredAt ? new Date(expiredAt) : null;
    }

    private userProducer: ApiUserProducer = inject(ApiUserProducer);
    private router: Router = inject(Router);

    public readonly auth: WritableSignal<boolean> = signal(Boolean(this.localAccessToken));
    public readonly token: WritableSignal<string> = signal(this.localAccessToken);

    public setToken(tokens: IAuthResponse): void {
        this.setAuthToken(tokens.access);
        this.localRefreshToken = tokens.refresh;
    }

    public logout(): void {
        this.token.set(null);
        this.auth.set(false);

        this.localAccessToken = null;
        this.localRefreshToken = null;

        this.router.navigate(['/']);
    }

    public deleteToken(): void {
        this.userProducer
            .userControllerLogout({ access: this.localAccessToken, refresh: this.localRefreshToken })
            .subscribe(() => this.logout());
    }

    public setAuthToken(token: string): void {
        this.localAccessToken = token;
        this.token.set(token);
        this.auth.set(true);
    }

    public tryToRefresh(): void {
        if (!this.auth()) {
            return;
        }

        if (this.accessExpiredAt().valueOf() > Date.now()) {
            return;
        }

        if (
            this.refreshExpiredAt().valueOf() < Date.now()
        ) {
            return this.logout();
        }

        this.userProducer.userControllerRefresh({ access: this.localAccessToken, refresh: this.localRefreshToken })
            .subscribe(
                (result: IRefreshToken) => {
                    this.setAuthToken(result.access);
                },
                (error: HttpErrorResponse) => {
                    console.error(error.message);

                    this.logout();
                });
    }
}
