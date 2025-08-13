/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { LogoutCredentialsDto } from '../models/LogoutCredentialsDto';
import type { RefreshTokenCredentialsDto } from '../models/RefreshTokenCredentialsDto';
import type { UserCredentialsDto } from '../models/UserCredentialsDto';
import type { UserProfileDto } from '../models/UserProfileDto';
import type { UserTokensDTO } from '../models/UserTokensDTO';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class UserProducer {
    constructor(public readonly http: HttpClient) {}
    /**
     * @param requestBody
     * @returns string The user has been successfully created.
     * @throws ApiError
     */
    public userControllerRegister(
        requestBody: UserCredentialsDto,
    ): Observable<string> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/user/user/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns UserTokensDTO The user has been successfully authenticated.
     * @throws ApiError
     */
    public userControllerSignIn(
        requestBody: UserCredentialsDto,
    ): Observable<UserTokensDTO> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/user/user/sign-in',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns UserTokensDTO The auth token has been successfully refreshed.
     * @throws ApiError
     */
    public userControllerRefresh(
        requestBody: RefreshTokenCredentialsDto,
    ): Observable<UserTokensDTO> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/user/user/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any User has been logout.
     * @throws ApiError
     */
    public userControllerLogout(
        requestBody: LogoutCredentialsDto,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/user/user/logout',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @returns UserProfileDto Request of user profile.
     * @throws ApiError
     */
    public userControllerProfile(): Observable<UserProfileDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/user/user/profile',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
