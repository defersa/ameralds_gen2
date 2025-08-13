/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnumOrderStatus } from './EnumOrderStatus';
import type { ShortOrderPatternDto } from './ShortOrderPatternDto';
export type UserOrderDto = {
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
     * Order status
     */
    status: EnumOrderStatus;
    /**
     * Patterns
     */
    patterns: Array<ShortOrderPatternDto>;
};

