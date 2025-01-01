/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnumUserRole } from './EnumUserRole';
import type { ShortOrderPatternDto } from './ShortOrderPatternDto';
export type UserProfileDto = {
    /**
     * Id of entity
     */
    id: number;
    /**
     * Id of entity
     */
    createdAt: string;
    /**
     * Id of entity
     */
    updatedAt: string;
    /**
     * Email of user
     */
    email: string;
    /**
     * Users name
     */
    username: string;
    role: EnumUserRole;
    /**
     * Bought patterns
     */
    ownPatterns: Array<ShortOrderPatternDto>;
};

