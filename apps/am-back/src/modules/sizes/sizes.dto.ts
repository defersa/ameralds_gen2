import { ApiProperty } from "@nestjs/swagger";
import { PaginatedPageDto } from "../../common/common.dto";


export class CreateSizeDto {
    @ApiProperty({
        description: 'Value of size',
        type: 'number',
    })
    public value: number;
}

export class SizeDto {
    @ApiProperty({
        description: 'Value of size',
        type: 'number',
    })
    public value: number;

    @ApiProperty({
        description: 'Entity id',
        type: 'number',
    })
    public id: number;

    @ApiProperty({
        description: 'Date of creating at',
        type: Date,
    })
    public createdAt: Date;
}

export class SizesDto {
    @ApiProperty({
        description: 'List of sizes',
        type: SizeDto,
        isArray: true,
    })
    public items: SizeDto[];
}

export class SizesPaginatedPageDto extends PaginatedPageDto {
    @ApiProperty({
        description: 'Paginated sizes',
        type: SizeDto,
        isArray: true,
    })
    public items: SizeDto[];
}
