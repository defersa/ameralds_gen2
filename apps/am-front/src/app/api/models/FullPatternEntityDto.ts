/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileDto } from './FileDto';
import type { FullPatternSizeDto } from './FullPatternSizeDto';
import type { ImageDto } from './ImageDto';
import type { LabelEntityDto } from './LabelEntityDto';
import type { NumberEntityDto } from './NumberEntityDto';
export type FullPatternEntityDto = {
    /**
     * Id of entity
     */
    id: number;
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
     * Ids of categories
     */
    categories: Array<number>;
    /**
     * Pattern images
     */
    images: Array<ImageDto>;
    /**
     * Color file of pattern
     */
    color: FileDto;
    /**
     * Sizes of pattern
     */
    sizes: Array<FullPatternSizeDto>;
};

