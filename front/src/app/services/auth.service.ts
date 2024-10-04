import { inject, Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { IAuthResponse, IRefreshToken } from "@am/interface/profile.interface";
import { HttpErrorResponse } from "@angular/common/http";
import { UBehaviorSubject } from "@am/utils/u-behavior.subject";
import { LocalStorage } from "@am/decorators/local.decorator";
import { Router } from "@angular/router";
import { UserService } from "@am/root/api";
import { jwtDecode } from "jwt-decode";


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

    private userService: UserService = inject(UserService);
    private router: Router = inject(Router);

    public readonly authStatus$: UBehaviorSubject<boolean> = new UBehaviorSubject<boolean>(!!this.localAccessToken);
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
        this.userService.userControllerLogout({ access: this.localAccessToken, refresh: this.localRefreshToken })
            .subscribe(() => this.logout());
    }

    public setAuthToken(token: string): void {
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

        this.userService.userControllerRefresh({ access: this.localAccessToken, refresh: this.localRefreshToken })
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
