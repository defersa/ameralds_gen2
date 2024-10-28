/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { ImageDto } from '../models/ImageDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class ImagesProducer {
    constructor(public readonly http: HttpClient) {}
    /**
     * @param formData
     * @returns ImageDto The image successfully created.
     * @throws ApiError
     */
    public imagesControllerCreate(
        formData: {
            file?: Blob;
        },
    ): Observable<ImageDto> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/images/create',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
