import { ApiProperty } from "@nestjs/swagger";


export class EntityDto {
    @ApiProperty({
        description: 'Id of entity',
        type: 'number',
    })
    public id: number;
}

export class BaseEntityDto {
    @ApiProperty({
        description: 'Id of entity',
        type: 'number',
    })
    public id: number;

    @ApiProperty({
        description: 'Id of entity',
        type: Date,
    })
    public createdAt: Date;

    @ApiProperty({
        description: 'Id of entity',
        type: Date,
    })
    public updatedAt: Date;
}

export class SuccessCreateDto extends EntityDto {}

export class LabelEntityDto {
    @ApiProperty({
        description: 'Russian label',
        type: 'string',
    })
    public ru: string;

    @ApiProperty({
        description: 'English label',
        type: 'string',
    })
    public en: string;
}

export class NumberEntityDto {
    @ApiProperty({
        description: 'Russian number',
        type: 'number',
    })
    public ru: number;

    @ApiProperty({
        description: 'English number',
        type: 'number',
    })
    public en: number;
}

export class PaginatedPageDto {
    @ApiProperty({
        description: 'Current page',
        type: 'number',
    })
    public page: number;

    @ApiProperty({
        description: 'Count of pages',
        type: 'number',
    })
    public count: number;
}

export class ParamsEntityDto {
    @ApiProperty({
        description: 'Params of entity',
        type: 'number',
    })
    public id: number;
}

export class ParamsIdsDto {
    @ApiProperty({
        description: 'Params with ids',
        type: 'number',
        isArray: true,
    })
    public ids: number[];
}

export class ParamsPaginatedDto {
    @ApiProperty({
        description: 'Paginated page',
        type: 'number',
    })
    public page: number;
}
