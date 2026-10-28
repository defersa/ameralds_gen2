import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, from, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { getAction, HttpAuthActions, RestSuffixFragments } from '../utils/action-builder';
import { AuthService } from './auth.service';
import { ReCAPTCHA } from '@am-front/interface/recapcha';
import { environment } from '../../environments/environment';
import { AuthRequestPayload, IAuthResponse } from '@am-front/interface/profile.interface';
import { IResultRequest } from '@am-front/interface/request.interface';
import { EnumUserRole, UserCredentialsDto, UserRegistrationCredentialsDto, ApiUserProducer, UserProfileDto, UserTokensDTO, UserProfilePatternDto } from '@am-front/root/api-v2';

declare const grecaptcha: ReCAPTCHA;

@Injectable({ providedIn: 'root' })
export class ProfileService {
    private authService = inject(AuthService);
    private httpClient = inject(HttpClient);
    private userService = inject(ApiUserProducer);
    private profileRequest: Observable<UserProfileDto | null> | null = null;
    private loadedToken: string | null = null;
    private profileToken = signal<string | null>(null);

    public user$ = new BehaviorSubject<UserProfileDto | null>(null);
    public readonly userStatus = signal<EnumUserRole | null>(null);
    public readonly isAdmin = computed(() => this.authService.auth() && this.profileToken() === this.authService.token() && this.userStatus() === EnumUserRole.Admin);
    public readonly boughtPatterns = signal<UserProfilePatternDto[]>([]);

    constructor() {
        toObservable(this.authService.token).pipe(
            switchMap(token => {
                if (!token) {
                    this.setProfile(null);
                    return of(null);
                }
                return this.loadProfile();
            }),
        ).subscribe();
    }

    private setProfile(profile: UserProfileDto | null): void {
        this.user$.next(profile);
        this.profileToken.set(profile ? this.authService.token() : null);
        this.userStatus.set(profile?.role ?? null);
        this.boughtPatterns.set(profile?.ownPatterns ?? []);
    }

    public loadProfile(): Observable<UserProfileDto | null> {
        const token = this.authService.token();
        if (!this.authService.auth()) {
            this.setProfile(null);
            return of(null);
        }
        if (this.profileToken() === token && this.user$.value) {
            return of(this.user$.value);
        }
        if (this.profileRequest && this.loadedToken === token) {
            return this.profileRequest;
        }
        this.setProfile(null);
        this.loadedToken = token;
        const request = this.userService.userControllerProfile().pipe(
            catchError(() => of(null)),
            tap(profile => {
                if (this.authService.token() === token) {
                    this.setProfile(profile);
                }
            }),
            finalize(() => {
                if (this.profileRequest === request) {
                    this.profileRequest = null;
                }
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
        this.profileRequest = request;
        return request;
    }

    public authWithRecaptchaToken(value: AuthRequestPayload): Observable<IAuthResponse> {
        return from(grecaptcha.execute(environment.recaptcha.siteKey, { action: 'submit' })).pipe(
            switchMap(token => this.httpClient.post<IAuthResponse>(getAction(HttpAuthActions.TokenAuth, RestSuffixFragments.Auth), { token, ...value })),
        );
    }

    public authUser(body: UserCredentialsDto): Observable<UserTokensDTO> {
        return this.userService.userControllerSignIn(body);
    }

    public createUser(data: UserRegistrationCredentialsDto): Observable<void> {
        return this.userService.userControllerRegister(data);
    }

    public sendVerify(): Observable<unknown> {
        return this.httpClient.get<unknown>(getAction(HttpAuthActions.SendVerifyToken, RestSuffixFragments.Auth));
    }

    public verifyProfile(data: { user: string; token: string }): Observable<IResultRequest> {
        return this.httpClient.post<IResultRequest>(getAction(HttpAuthActions.Verify, RestSuffixFragments.Auth), data);
    }
}
