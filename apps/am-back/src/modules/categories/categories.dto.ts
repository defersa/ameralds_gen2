import { ApiProperty } from "@nestjs/swagger";
import { LabelEntityDto, PaginatedPageDto } from "../../common/common.dto";


export class CreateCategoryDto extends LabelEntityDto {}

export class CategoryDto {
    @ApiProperty({
        description: 'Label of category',
        type: LabelEntityDto,
    })
    public label: LabelEntityDto;

    @ApiProperty({
        description: 'English label',
        type: 'string',
    })
    public id: number;

    @ApiProperty({
        description: 'Date of creating at',
        type: Date,
    })
    public createdAt: Date;
}

export class CategoriesDto {
    @ApiProperty({
        description: 'List of categories',
        type: CategoryDto,
        isArray: true,
    })
    public items: CategoryDto[];
}

export class CategoriesPaginatedPageDto extends PaginatedPageDto {
    @ApiProperty({
        description: 'Paginated categories',
        type: CategoryDto,
        isArray: true,
    })
    public items: CategoryDto[];
}
