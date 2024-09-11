/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class DefaultService {
    constructor(public readonly http: HttpClient) {}
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerGetHello(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/test',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerGetAuthHello(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/auth-test',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerGetFile(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/file',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerUpload(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/upload',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerImage(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/image',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerFakeHandlerOne(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/categories/all',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public appControllerFakeHandlerTwo(): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/sizes/all',
        });
    }
    /**
     * @param page
     * @returns any
     * @throws ApiError
     */
    public appControllerFakeHandlerThree(
        page: number,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/patterns/paginated',
            query: {
                'page': page,
            },
        });
    }
}
