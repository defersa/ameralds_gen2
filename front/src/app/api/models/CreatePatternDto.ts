/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LabelEntityDto } from './LabelEntityDto';
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
};

