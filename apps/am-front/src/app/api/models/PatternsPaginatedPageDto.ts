/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatternEntityDto } from './PatternEntityDto';
export type PatternsPaginatedPageDto = {
    /**
     * Current page
     */
    page: number;
    /**
     * Count of pages
     */
    count: number;
    /**
     * Paginated patterns
     */
    items: Array<PatternEntityDto>;
};

