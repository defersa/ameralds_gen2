/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LabelEntityDto } from './LabelEntityDto';
import type { NumberEntityDto } from './NumberEntityDto';
import type { PatternSizeDto } from './PatternSizeDto';
export type CreatePatternDto = {
    /**
     * Name of pattern
     */
    name: LabelEntityDto;
    /**
     * Description of pattern
     */
    description: LabelEntityDto;
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
    /**
     * Pattern visible status
     */
    hidden: boolean;
    /**
     * Colors of pattern
     */
    color: number;
    /**
     * Pattern images
     */
    images: Array<number>;
    /**
     * Categories of pattern
     */
    categories: Array<number>;
    /**
     * Sizes of pattern
     */
    sizes: Array<PatternSizeDto>;
};

