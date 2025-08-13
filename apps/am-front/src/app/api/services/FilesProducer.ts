/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { FileDto } from '../models/FileDto';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
@Injectable({
    providedIn: 'root',
})
export class FilesProducer {
    constructor(public readonly http: HttpClient) {}
    /**
     * @param formData
     * @returns FileDto The file successfully created.
     * @throws ApiError
     */
    public filesControllerCreatePrivateFile(
        formData: {
            file?: Blob;
        },
    ): Observable<FileDto> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/files/private/create',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
    /**
     * @param id Params of entity
     * @returns binary
     * @throws ApiError
     */
    public filesControllerGetPrivateFile(
        id: number,
    ): Observable<Blob> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/files/private/download/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Something went wrong.`,
            },
        });
    }
}
