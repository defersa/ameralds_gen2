/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CategoryDto } from './CategoryDto';
export type CategoriesPaginatedPageDto = {
    /**
     * Current page
     */
    page: number;
    /**
     * Count of pages
     */
    count: number;
    /**
     * Categories list
     */
    items: Array<CategoryDto>;
};

