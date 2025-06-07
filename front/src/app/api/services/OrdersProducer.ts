/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { ShortOrderPatternDto } from '../models/ShortOrderPatternDto';
import type { SuccessCreateDto } from '../models/SuccessCreateDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class OrdersProducer {
    constructor(public readonly http: HttpClient) {}
    /**
     * @param requestBody
     * @returns SuccessCreateDto The pattern successfully created.
     * @throws ApiError
     */
    public ordersControllerUpdate(
        requestBody: Array<ShortOrderPatternDto>,
    ): Observable<SuccessCreateDto> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/orders/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
