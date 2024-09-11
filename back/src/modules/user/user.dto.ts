import { ApiProperty } from '@nestjs/swagger';


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
    refresh: string;
}

