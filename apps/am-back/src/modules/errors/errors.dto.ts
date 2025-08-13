import { ApiProperty } from "@nestjs/swagger";


export enum ApiErrorCodes {
    ALREADY_EXIST = 'ALREADY_EXIST',
    INVALID_PASSWORD = 'INVALID_PASSWORD',
    INVALID_EMAIL = 'INVALID_EMAIL',

    NOT_EXIST = 'NOT_EXIST',
    INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
    EXPIRED = 'EXPIRED',

    NOT_UNIQUE = 'NOT_UNIQUE',
}


export enum ApiEntityNames {
    CATEGORY = 'category',
    SIZE = 'size',
    PATTERN = 'pattern',
    PATTERN_SIZE = 'patternSize',
    FILE = 'file',
}

export class ErrorsDto {
    @ApiProperty({
        description: 'Code of error',
        enum: ApiErrorCodes,
        enumName: 'EnumApiErrorCodes',
    })
    public code: ApiErrorCodes;

    @ApiProperty({
        description: 'Error entity name',
        enum: ApiEntityNames,
        enumName: 'EnumApiEntityNames',
    })
    public entity?: ApiEntityNames;
}
