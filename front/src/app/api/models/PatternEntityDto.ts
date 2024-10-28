/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileDto } from './FileDto';
import type { ImageDto } from './ImageDto';
import type { LabelEntityDto } from './LabelEntityDto';
export type PatternEntityDto = {
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
};

