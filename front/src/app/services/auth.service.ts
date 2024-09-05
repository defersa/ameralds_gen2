import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IAuthResponse, IRefreshToken } from "@am/interface/profile.interface";
import { getAction, HttpAuthActions, RestSuffixFragments } from "@am/utils/action-builder";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { UBehaviorSubject } from "@am/utils/u-behavior.subject";
import { LocalStorage } from "@am/decorators/local.decorator";
import { Router } from "@angular/router";


const AUTH_TOKEN_NAME: string = 'authToken';
const REFRESH_TOKEN_NAME: string = 'refreshToken';
const EXPIRATION_DELTA: string = 'expirationDelta'
const REFRESH_EXPIRATION_DELTA: string = 'refreshExpirationDelta';

const TOKEN_TIME_ALIVE_DAYS: number = 7;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    @LocalStorage(AUTH_TOKEN_NAME)
    private localAuthToken!: string;

    @LocalStorage(REFRESH_TOKEN_NAME)
    private localRefreshToken!: string;

    @LocalStorage(EXPIRATION_DELTA)
    private localExpirationDelta!: string;

    @LocalStorage(REFRESH_EXPIRATION_DELTA)
    private localRefreshExpirationDelta!: string;


    public readonly authStatus$: UBehaviorSubject<boolean> = new UBehaviorSubject<boolean>(!!this.localAuthToken);
    public readonly token$: BehaviorSubject<string> = new BehaviorSubject<string>(this.localAuthToken);


    constructor(
        private httpClient: HttpClient,
        private router: Router,
    ) {
    }

    public setToken(tokens: IAuthResponse): void {
        this.setAuthToken(tokens.access);
        this.localRefreshToken = tokens.refresh;

        this.setExpirationDelta();
        this.setRefreshExpirationDelta();
    }

    public logout(): void {
        this.token$.next(null);
        this.authStatus$.next(false);

        this.localAuthToken = '';
        this.localRefreshToken = '';
        this.localExpirationDelta = '';
        this.localRefreshExpirationDelta = '';

        this.router.navigate(['/']);
    }

    public setAuthToken(token: string): void {
        this.token$.next(token);
        this.localAuthToken = token;
        this.authStatus$.next(true);
    }


    public setExpirationDelta(rememberMe: boolean = true): void {
        const nextExpiration: Date = new Date();
        this.localExpirationDelta = String(nextExpiration.setDate(nextExpiration.getDate() + AuthService.getDaysOfRemember(rememberMe)));
    }

    public setRefreshExpirationDelta(rememberMe: boolean = true): void {
        const nextExpiration: Date = new Date();
        this.localRefreshExpirationDelta = String(nextExpiration.setDate(nextExpiration.getDate() + AuthService.getDaysOfRemember(rememberMe)));
    }

    public static getDaysOfRemember(flag: boolean): number {
        return flag ? TOKEN_TIME_ALIVE_DAYS : 0;
    }

    public tryRefreshToken(): void {
        if (
            this.authStatus$.getValue() &&
            Number(this.localExpirationDelta) > Date.now() &&
            Number(this.localRefreshExpirationDelta) > Date.now()
        ) {
            const refreshToken: Record<string, string> = { refresh: this.localRefreshToken };
            this.httpClient.post<IRefreshToken>(getAction(HttpAuthActions.RefreshToken, RestSuffixFragments.Auth), refreshToken)
                .subscribe(
                    (result: IRefreshToken) => {
                        this.setExpirationDelta();
                        this.setAuthToken(result.access);
                    },
                    (error: HttpErrorResponse) => {
                        console.log(error.message);
                        this.logout();
                    });
            return;
        }

        this.logout();
    }
}
