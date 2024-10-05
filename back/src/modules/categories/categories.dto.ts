import { ApiProperty } from "@nestjs/swagger";
import { LabelEntityDto } from "../../common/common.dto";


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
}

export class CategoriesDto {
    @ApiProperty({
        description: 'List of categories',
        type: Array<CategoryDto>,
    })
    public items: CategoryDto[];
}
