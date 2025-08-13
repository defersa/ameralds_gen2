import { inject, Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { IAuthResponse, IRefreshToken } from "@am-front/interface/profile.interface";
import { HttpErrorResponse } from "@angular/common/http";
import { UBehaviorSubject } from "@am-front/utils/u-behavior.subject";
import { LocalStorage } from "@am-front/decorators/local.decorator";
import { Router } from "@angular/router";
import { jwtDecode } from "jwt-decode";
import { UserProducer } from "@am-front/root/api";


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

    private userProducer: UserProducer = inject(UserProducer);
    private router: Router = inject(Router);

    public readonly authStatus$: UBehaviorSubject<boolean> = new UBehaviorSubject<boolean>(Boolean(this.localAccessToken));
    public readonly token$: BehaviorSubject<string> = new BehaviorSubject<string>(this.localAccessToken);

    public setToken(tokens: IAuthResponse): void {
        this.setAuthToken(tokens.access);
        this.localRefreshToken = tokens.refresh;
    }

    public logout(): void {
        this.token$.next(null);
        this.authStatus$.next(false);

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
        console.log(token)
        this.token$.next(token);
        this.localAccessToken = token;
        this.authStatus$.next(true);
    }

    public tryToRefresh(): void {
        if (!this.authStatus$.getValue()) {
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
