import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import {
    getAction,
    HttpAuthActions,
    RestSuffixFragments, UB
} from '../utils/action-builder';
import { UserEnum } from '../utils/router-builder';
import { AuthService } from './auth.service';
import { GoodsService } from './goods.service';
import { ReCAPTCHA } from "@am/interface/recapcha";
import { environment } from "../../environments/environment";
import { switchMap } from "rxjs/operators";

import {
    AuthRequestPayload,
    IAuthResponse,
    IUser,
} from "@am/interface/profile.interface";
import { AuthRegistrationRequest } from "@am/interface/request/auth-request.interface";
import { IResultRequest } from "@am/interface/request.interface";
import { UBehaviorSubject } from "@am/utils/u-behavior.subject";
import { LocalStorage } from "@am/decorators/local.decorator";
import { EnumUserRole, UserCredentialsDto, type UserProfileDto, UserService, UserTokensDTO } from "@am/root/api";


declare var grecaptcha: ReCAPTCHA;

const USER_STATUS_STORAGE_KEY: string = "user_status";

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    @LocalStorage(USER_STATUS_STORAGE_KEY)
    public localUserStatus!: string;

    private authService: AuthService = inject(AuthService);
    private goodsService: GoodsService = inject(GoodsService);
    private httpClient: HttpClient = inject(HttpClient);
    private userService: UserService = inject(UserService);

    public profile$: BehaviorSubject<IUser> = new BehaviorSubject<IUser>(null);
    public userStatus$: UBehaviorSubject<UserEnum> = new UBehaviorSubject<UserEnum>(this.localUserStatus as UserEnum || UserEnum.Unauthorized);

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
                    status ?
                        this.userService.userControllerProfile() :
                        of(null)))
            .subscribe((profile: UserProfileDto | null) => {
                // this.profile$.next(profile ?? null);

                this.userStatus$.next(this._getUserStatusByProfile(profile));
                this.localUserStatus = this.userStatus$.getValue();

                // this.goodsService.goods = profile?.person.goods ?? null;
                // this.rawBoughtPatterns = profile?.person.patterns ?? [];
            });
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
