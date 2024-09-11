/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { UserCredentialsDto } from '../models/UserCredentialsDto';
import type { UserTokensDTO } from '../models/UserTokensDTO';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class UserService {
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
            url: '/api/user/register',
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
            url: '/api/user/sign-in',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
