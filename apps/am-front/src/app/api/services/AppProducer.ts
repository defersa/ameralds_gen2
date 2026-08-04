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
export class AppProducer {
    constructor(public readonly http: HttpClient) {}
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
     * @returns number
     * @throws ApiError
     */
    public appControllerImage(): Observable<number> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/image',
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
