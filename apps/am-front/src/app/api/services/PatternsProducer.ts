/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CreatePatternDto } from '../models/CreatePatternDto';
import type { FullPatternEntityDto } from '../models/FullPatternEntityDto';
import type { PatternEntityDto } from '../models/PatternEntityDto';
import type { PatternsPaginatedPageDto } from '../models/PatternsPaginatedPageDto';
import type { SuccessCreateDto } from '../models/SuccessCreateDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class PatternsProducer {
    constructor(public readonly http: HttpClient) {}
    /**
     * @param requestBody
     * @returns SuccessCreateDto The pattern successfully created.
     * @throws ApiError
     */
    public patternsControllerCreate(
        requestBody: CreatePatternDto,
    ): Observable<SuccessCreateDto> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/patterns/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param page Paginated page
     * @returns PatternsPaginatedPageDto
     * @throws ApiError
     */
    public patternsControllerPage(
        page: number,
    ): Observable<PatternsPaginatedPageDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/patterns/list/{page}',
            path: {
                'page': page,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id
     * @returns PatternEntityDto
     * @throws ApiError
     */
    public patternsControllerByIds(
        id: Array<string>,
    ): Observable<Record<string, PatternEntityDto>> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/patterns/ids',
            query: {
                'id': id,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id Params of entity
     * @param requestBody
     * @returns SuccessCreateDto The category has been successfully edited.
     * @throws ApiError
     */
    public patternsControllerEdit(
        id: number,
        requestBody: CreatePatternDto,
    ): Observable<SuccessCreateDto> {
        return __request(OpenAPI, this.http, {
            method: 'PATCH',
            url: '/api/patterns/edit/{id}',
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
    /**
     * @param id Params of entity
     * @returns FullPatternEntityDto
     * @throws ApiError
     */
    public patternsControllerEntity(
        id: number,
    ): Observable<FullPatternEntityDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/patterns/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
