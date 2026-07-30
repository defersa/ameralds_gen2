import { HttpClient } from "@angular/common/http";
import { computed, effect, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { BehaviorSubject, from, Observable, of } from "rxjs";
import { getAction, HttpAuthActions, RestSuffixFragments } from "../utils/action-builder";
import { UserEnum } from "../utils/router-builder";
import { AuthService } from "./auth.service";
import { CartService } from "./cart.service";
import { ReCAPTCHA } from "@am-front/interface/recapcha";
import { environment } from "../../environments/environment";
import { map, skip, switchMap } from "rxjs/operators";

import { AuthRequestPayload, IAuthResponse } from "@am-front/interface/profile.interface";
import { IResultRequest } from "@am-front/interface/request.interface";
import { LocalStorage } from "@am-front/decorators/local.decorator";
import {
    EnumUserRole,
    SuccessCreateDto,
    type ShortOrderPatternDto,
    UserCredentialsDto, type UserOrderDto,
    UserProducer,
    UserProfileDto,
    UserTokensDTO
} from "@am-front/root/api";


declare var grecaptcha: ReCAPTCHA;

const USER_STATUS_STORAGE_KEY: string = "user_status";

@Injectable({
    providedIn: "root"
})
export class ProfileService {
    @LocalStorage(USER_STATUS_STORAGE_KEY)
    public localUserStatus!: EnumUserRole;

    private authService: AuthService = inject(AuthService);
    private httpClient: HttpClient = inject(HttpClient);
    private userService: UserProducer = inject(UserProducer);

    public user$: BehaviorSubject<UserProfileDto> = new BehaviorSubject<UserProfileDto>(null);
    public readonly userStatus: WritableSignal<EnumUserRole> = signal(this.localUserStatus);
    public readonly isAdmin: Signal<boolean> = computed(() => this.userStatus() === EnumUserRole.ADMIN);

    public boughtPatterns$: BehaviorSubject<ShortOrderPatternDto[]> = new BehaviorSubject<ShortOrderPatternDto[]>([]);
    public userCart$: BehaviorSubject<UserOrderDto> = new BehaviorSubject<UserOrderDto>(null);

    constructor() {
        this.initProfile();
    }

    private initProfile(): void {
        this.user$
            .pipe(
                skip(1),
            )
            .subscribe((user: UserProfileDto) => {
                this.userStatus.set(user?.role ?? null);
                this.boughtPatterns$.next(user?.ownPatterns ?? []);
                this.userCart$.next(user?.cart ?? null);
            });

        this.authService.authStatus$
            .pipe(
                switchMap((status: boolean) => status ? this.userService.userControllerProfile() : of(null))
            )
            .subscribe((profile: UserProfileDto) => this.user$.next(profile));


        effect(() => {
            this.localUserStatus = this.userStatus();
        });
    }

    public authWithRecaptchaToken(value: AuthRequestPayload): Observable<IAuthResponse> {
        return from(grecaptcha.execute(environment.recaptcha.siteKey, { action: "submit" }))
            .pipe(
                switchMap((token: string) =>
                    this.httpClient.post<IAuthResponse>(getAction(HttpAuthActions.TokenAuth, RestSuffixFragments.Auth), { token, ...value }))
            );
    }

    public authUser(body: UserCredentialsDto): Observable<UserTokensDTO> {
        return this.userService.userControllerSignIn(body);
    }

    public createUser(data: UserCredentialsDto): Observable<SuccessCreateDto> {
        return this.userService.userControllerRegister(data);
    }

    public sendVerify(): Observable<unknown> {
        return this.httpClient.get<unknown>(getAction(HttpAuthActions.SendVerifyToken, RestSuffixFragments.Auth));
    }

    public verifyProfile(data: { user: string; token: string; }): Observable<IResultRequest> {
        return this.httpClient.post<IResultRequest>(getAction(HttpAuthActions.Verify, RestSuffixFragments.Auth), data);
    }

    private _getUserStatusByProfile(value: UserProfileDto | null): UserEnum {
        if (!value) {
            return UserEnum.Unauthorized;
        }

        return value.role === EnumUserRole.ADMIN ?
            UserEnum.Moder :
            UserEnum.Authorized;
    }
}
