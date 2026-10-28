import { ApiProperty } from '@nestjs/swagger';
import { CartOrderPatternSizeDto } from "../orders/dto/orders.dto";
import { BaseEntityDto } from "../../common/common.dto";
import { UserRole } from '../../db/entities/user.entity';


export class UserCredentialsDto {
    @ApiProperty({
        description: 'User email',
        type: 'string',
        maxLength: 254,
    })
    public email: string;

    @ApiProperty({
        description: 'User password',
        type: 'string',
        maxLength: 1024,
    })
    public password: string;
}

export class UserRegistrationCredentialsDto extends UserCredentialsDto {
    @ApiProperty({ description: 'New password, at most 72 UTF-8 bytes. Applied only when a new account is confirmed by email; existing credentials are never changed.', type: 'string', minLength: 8, maxLength: 72 })
    public override password: string;
}

export class UserTokensDTO {
    @ApiProperty({
        description: 'Access token',
        type: 'string',
    })
    public access: string;

}

export class EmailLoginRequestDto {
    @ApiProperty({ description: 'Account email', type: String, maxLength: 254 })
    public email: string;

    @ApiProperty({ description: 'Local path to open after authentication', type: String, required: false, default: '/account/profile', maxLength: 2048 })
    public redirectPath?: string;
}

export class EmailLoginTokenDto {
    @ApiProperty({ description: 'Opaque login or registration confirmation token, valid for one use within 7 days', type: String, minLength: 43, maxLength: 43 })
    public token: string;
}

export class EmailLoginResponseDto extends UserTokensDTO {
    @ApiProperty({ description: 'Local destination saved when issuing the login link', type: String })
    public redirectPath: string;
}

export class UserProfilePatternEntityDto extends BaseEntityDto {}

export class UserProfilePatternDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes of bought pattern',
        type: CartOrderPatternSizeDto,
        isArray: true,
    })
    public sizes: CartOrderPatternSizeDto[];

    @ApiProperty({
        description: 'Pattern',
        type: UserProfilePatternEntityDto,
    })
    public pattern: UserProfilePatternEntityDto;

    @ApiProperty({
        description: 'Status of colors able',
        type: 'boolean',
    })
    public color: boolean;
}

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
        type: UserProfilePatternDto,
        isArray: true
    })
    public ownPatterns: UserProfilePatternDto[];
}
