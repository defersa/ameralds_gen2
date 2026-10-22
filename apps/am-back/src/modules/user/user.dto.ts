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
    @ApiProperty({ description: 'New password, at most 72 UTF-8 bytes', type: 'string', minLength: 8, maxLength: 72 })
    public override password: string;
}

export class UserTokensDTO {
    @ApiProperty({
        description: 'Access token',
        type: 'string',
    })
    public access: string;

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
