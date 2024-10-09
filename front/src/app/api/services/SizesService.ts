/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CreateSizeDto } from '../models/CreateSizeDto';
import type { SizeDto } from '../models/SizeDto';
import type { SizesDto } from '../models/SizesDto';
import type { SizesPaginatedPageDto } from '../models/SizesPaginatedPageDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class SizesService {
    constructor(public readonly http: HttpClient) {}
    /**
     * @returns SizesDto Get all sizes.
     * @throws ApiError
     */
    public sizesControllerAll(): Observable<SizesDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/sizes/all',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SizeDto The size has been successfully created.
     * @throws ApiError
     */
    public sizesControllerCreate(
        requestBody: CreateSizeDto,
    ): Observable<SizeDto> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/sizes/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id Params of entity
     * @returns any The size has been successfully removed.
     * @throws ApiError
     */
    public sizesControllerRemove(
        id: number,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'DELETE',
            url: '/api/sizes/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id Params of entity
     * @returns SizeDto Size returned.
     * @throws ApiError
     */
    public sizesControllerEntity(
        id: number,
    ): Observable<SizeDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/sizes/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param page Paginated page
     * @returns SizesPaginatedPageDto The size has been successfully removed.
     * @throws ApiError
     */
    public sizesControllerPage(
        page: number,
    ): Observable<SizesPaginatedPageDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/sizes/list/{page}',
            path: {
                'page': page,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id Params of entity
     * @param requestBody
     * @returns SizeDto The category has been successfully edited.
     * @throws ApiError
     */
    public sizesControllerEdit(
        id: number,
        requestBody: CreateSizeDto,
    ): Observable<SizeDto> {
        return __request(OpenAPI, this.http, {
            method: 'PATCH',
            url: '/api/sizes/edit/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
