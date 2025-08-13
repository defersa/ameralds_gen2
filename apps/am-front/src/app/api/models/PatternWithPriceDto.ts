/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NumberEntityDto } from './NumberEntityDto';
export type PatternWithPriceDto = {
    /**
     * Id of entity
     */
    id: number;
    /**
     * Id of entity
     */
    createdAt?: string;
    /**
     * Id of entity
     */
    updatedAt?: string;
    /**
     * Base price of pattern
     */
    basePrice: NumberEntityDto;
    /**
     * Additional price of pattern
     */
    additionalPrice: NumberEntityDto;
    /**
     * Color price of pattern
     */
    colorPrice: NumberEntityDto;
};

