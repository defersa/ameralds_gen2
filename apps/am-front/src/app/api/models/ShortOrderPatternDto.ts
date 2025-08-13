/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatternWithPriceDto } from './PatternWithPriceDto';
export type ShortOrderPatternDto = {
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
     * Sizes ids
     */
    sizes: Array<number>;
    /**
     * Status of colors able
     */
    color: boolean;
    /**
     * Status of colors able
     */
    bought: boolean;
    /**
     * Pattern with prices
     */
    pattern: PatternWithPriceDto;
};

