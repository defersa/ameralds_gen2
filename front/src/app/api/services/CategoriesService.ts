/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CategoryDto } from '../models/CategoryDto';
import type { CreateCategoryDto } from '../models/CreateCategoryDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class CategoriesService {
    constructor(public readonly http: HttpClient) {}
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
            url: '/api/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
