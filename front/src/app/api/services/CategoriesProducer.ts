/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CategoriesDto } from '../models/CategoriesDto';
import type { CategoriesPaginatedPageDto } from '../models/CategoriesPaginatedPageDto';
import type { CategoryDto } from '../models/CategoryDto';
import type { CreateCategoryDto } from '../models/CreateCategoryDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class CategoriesProducer {
    constructor(public readonly http: HttpClient) {}
    /**
     * @returns CategoriesDto Get all categories.
     * @throws ApiError
     */
    public categoriesControllerAll(): Observable<CategoriesDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/categories/all',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns CategoryDto The category has been successfully created.
     * @throws ApiError
     */
    public categoriesControllerCreate(
        requestBody: CreateCategoryDto,
    ): Observable<CategoryDto> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/categories/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id Params of entity
     * @returns any The category has been successfully removed.
     * @throws ApiError
     */
    public categoriesControllerRemove(
        id: number,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'DELETE',
            url: '/api/categories/{id}',
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
     * @returns CategoryDto Category returned.
     * @throws ApiError
     */
    public categoriesControllerEntity(
        id: number,
    ): Observable<CategoryDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/categories/{id}',
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
     * @returns CategoriesPaginatedPageDto The list of categories successfully returned.
     * @throws ApiError
     */
    public categoriesControllerPage(
        page: number,
    ): Observable<CategoriesPaginatedPageDto> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/categories/list/{page}',
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
     * @returns CategoryDto The category has been successfully edited.
     * @throws ApiError
     */
    public categoriesControllerEdit(
        id: number,
        requestBody: CreateCategoryDto,
    ): Observable<CategoryDto> {
        return __request(OpenAPI, this.http, {
            method: 'PATCH',
            url: '/api/categories/edit/{id}',
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
