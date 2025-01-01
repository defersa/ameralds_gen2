import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from "@am/db/entities";
import { ShortOrderPatternDto } from "../orders/orders.dto";
import { BaseEntityDto } from "../../common/common.dto";


export class UserCredentialsDto {
    @ApiProperty({
        description: 'User email',
        type: 'string',
    })
    public email: string;

    @ApiProperty({
        description: 'User password',
        type: 'string',
    })
    public password: string;
}

export class UserTokensDTO {
    @ApiProperty({
        description: 'Access token',
        type: 'string',
    })
    public access: string;

    @ApiProperty({
        description: 'Refresh token',
        type: 'string',
    })
    public refresh: string;
}

export class RefreshTokenCredentialsDto {
    @ApiProperty({
        description: 'Access token',
        type: 'string',
    })
    public access: string;

    @ApiProperty({
        description: 'Refresh token',
        type: 'string',
    })
    public refresh: string;
}

export class LogoutCredentialsDto extends RefreshTokenCredentialsDto {}

export class UserProfileDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Email of user',
        type: 'string',
    })
    public email: string;

    @ApiProperty({
        description: 'Users name',
        type: 'string',
    })
    public username: string;

    @ApiProperty({
        description: 'Users role',
        enum: UserRole,
        enumName: 'EnumUserRole',
    })
    public role: UserRole;

    @ApiProperty({
        description: 'Bought patterns',
        type: ShortOrderPatternDto,
        isArray: true
    })
    public ownPatterns: ShortOrderPatternDto[];
}
