import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, from, Observable, of } from "rxjs";
import { getAction, HttpAuthActions, RestSuffixFragments } from "../utils/action-builder";
import { UserEnum } from "../utils/router-builder";
import { AuthService } from "./auth.service";
import { CartService } from "./cart.service";
import { ReCAPTCHA } from "@am/interface/recapcha";
import { environment } from "../../environments/environment";
import { map, switchMap } from "rxjs/operators";

import { AuthRequestPayload, IAuthResponse, IUser } from "@am/interface/profile.interface";
import { IResultRequest } from "@am/interface/request.interface";
import { LocalStorage } from "@am/decorators/local.decorator";
import { EnumUserRole, UserCredentialsDto, UserProducer, UserProfileDto, UserTokensDTO } from "@am/root/api";


declare var grecaptcha: ReCAPTCHA;

const USER_STATUS_STORAGE_KEY: string = "user_status";

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    @LocalStorage(USER_STATUS_STORAGE_KEY)
    public localUserStatus!: EnumUserRole;

    private authService: AuthService = inject(AuthService);
    private goodsService: CartService = inject(CartService);
    private httpClient: HttpClient = inject(HttpClient);
    private userService: UserProducer = inject(UserProducer);

    public profile$: BehaviorSubject<IUser> = new BehaviorSubject<IUser>(null);
    public userStatus$: BehaviorSubject<EnumUserRole> = new BehaviorSubject<EnumUserRole>(this.localUserStatus);
    public isAdmin$: Observable<boolean> = this.userStatus$.pipe(map((role: EnumUserRole) => role === EnumUserRole.ADMIN));

    public set rawBoughtPatterns(value: { id: number }[]) {
        this.boughtPatterns$.next(value.map((item: { id: number }) => item.id))
    }

    public get boughtPatterns(): number[] {
        return this.boughtPatterns$.getValue();
    }

    public boughtPatterns$: BehaviorSubject<number[]> =
        new BehaviorSubject<number[]>([]);

    constructor(
    ) {
        this.authService.authStatus$
            .pipe(
                switchMap((status: boolean) =>
                    status ? this.userService.userControllerProfile() : of(null))
            )
            .subscribe((profile: UserProfileDto) => {
                this.userStatus$.next(profile?.role ?? null);
            });

        this.userStatus$.subscribe((role: EnumUserRole) => this.localUserStatus = role);
    }

    public authWithRecaptchaToken(value: AuthRequestPayload): Observable<IAuthResponse> {
        return from(grecaptcha.execute(environment.recaptcha.siteKey, {action: 'submit'}))
            .pipe(
                switchMap((token: string) =>
                    this.httpClient.post<IAuthResponse>(getAction(HttpAuthActions.TokenAuth, RestSuffixFragments.Auth), {token, ...value}))
            );
    }

    public authUser(body: UserCredentialsDto): Observable<UserTokensDTO> {
        return this.userService.userControllerSignIn(body);
    }

    // public getOwnProfile(): Observable<IProfile> {
    //     return this.httpClient.get<ProfileInterfaceResponse>(getAction(HttpProfileActions.Own, RestSuffixFragments.Profile))
    //         .pipe(
    //             map((response: ProfileInterfaceResponse) => ({
    //                 ...response.user,
    //                 dateJoined: moment(response.user.date_joined).format("YYYY.MM.DD HH:mm"),
    //                 isStaff: response.user.is_staff
    //             })));
    // }

    public postNewUser(data: UserCredentialsDto): Observable<string> {
        return this.userService.userControllerRegister(data);
    }

    public sendVerify(): Observable<unknown> {
         return this.httpClient.get<unknown>(getAction(HttpAuthActions.SendVerifyToken, RestSuffixFragments.Auth));
    }

    public verifyProfile(data: {user: string; token: string;}): Observable<IResultRequest> {
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
