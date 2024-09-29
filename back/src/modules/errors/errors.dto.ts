import { ApiProperty } from "@nestjs/swagger";


export enum ApiErrorCodes {
    ALREADY_EXIST = 'ALREADY_EXIST',
    INVALID_PASSWORD = 'INVALID_PASSWORD',
    INVALID_EMAIL = 'INVALID_EMAIL',

    NOT_EXIST = 'NOT_EXIST',
    INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
    EXPIRED = 'EXPIRED',
}

export class ErrorsDto {
    @ApiProperty({
        description: 'Code of error',
        enum: ApiErrorCodes,
        enumName: 'EnumApiErrorCodes',
    })
    public code: ApiErrorCodes;
}
