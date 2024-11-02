import { ApiProperty } from "@nestjs/swagger";
import { EntityDto, LabelEntityDto, NumberEntityDto, PaginatedPageDto } from "../../common/common.dto";
import { ImageDto } from "../images/images.dto";
import { FileDto } from "../files/files.dto";


export class PatternSizeDto extends EntityDto {
    @ApiProperty({
        description: 'Size id',
        type: 'number',
    })
    public size: number;

    @ApiProperty({
        description: 'Cbb file id',
        type: 'number',
    })
    public cbb: number;

    @ApiProperty({
        description: 'Pdf file id',
        type: 'number',
    })
    public pdf: number;

    @ApiProperty({
        description: 'Png file id',
        type: 'number',
    })
    public png: number;

    @ApiProperty({
        description: 'Jbb file id',
        type: 'number',
    })
    public jbb: number;
}

export class CreatePatternDto {
    @ApiProperty({
        description: 'Name of pattern',
        type: LabelEntityDto,
    })
    public name: LabelEntityDto;

    @ApiProperty({
        description: 'Description of pattern',
        type: LabelEntityDto,
    })
    public description: LabelEntityDto;

    @ApiProperty({
        description: 'Base price of pattern',
        type: NumberEntityDto,
    })
    public basePrice: NumberEntityDto;

    @ApiProperty({
        description: 'Additional price of pattern',
        type: NumberEntityDto,
    })
    public additionalPrice: NumberEntityDto;

    @ApiProperty({
        description: 'Color price of pattern',
        type: NumberEntityDto,
    })
    public colorPrice: NumberEntityDto;

    @ApiProperty({
        description: 'Pattern visible status',
        type: 'boolean',
    })
    public hidden: boolean;

    @ApiProperty({
        description: 'Colors of pattern',
        type: 'number',
    })
    public color: number;

    @ApiProperty({
        description: 'Pattern images',
        type: 'number',
        isArray: true,
    })
    public images: number[];

    @ApiProperty({
        description: 'Categories of pattern',
        type: 'number',
        isArray: true,
    })
    public categories: number[];

    @ApiProperty({
        description: 'Sizes of pattern',
        type: PatternSizeDto,
        isArray: true,
    })
    public sizes: PatternSizeDto[];
}

export class PatternEntityDto extends EntityDto {
    @ApiProperty({
        description: 'Name of pattern',
        type: LabelEntityDto,
    })
    public name: LabelEntityDto;

    @ApiProperty({
        description: 'Description of pattern',
        type: LabelEntityDto,
    })
    public description: LabelEntityDto;

    @ApiProperty({
        description: 'Base price of pattern',
        type: NumberEntityDto,
    })
    public basePrice: NumberEntityDto;

    @ApiProperty({
        description: 'Additional price of pattern',
        type: NumberEntityDto,
    })
    public additionalPrice: NumberEntityDto;

    @ApiProperty({
        description: 'Color price of pattern',
        type: NumberEntityDto,
    })
    public colorPrice: NumberEntityDto;

    @ApiProperty({
        description: 'Pattern visible status',
        type: 'boolean',
    })
    public hidden: boolean;

    @ApiProperty({
        description: 'Ids of categories',
        type: 'number',
        isArray: true,
    })
    public categories: number[];

    @ApiProperty({
        description: 'Pattern images',
        type: ImageDto,
        isArray: true,
    })
    public images: ImageDto[];

    @ApiProperty({
        description: 'Color file of pattern',
        type: FileDto,
    })
    public color: FileDto;

    @ApiProperty({
        description: 'Sizes of pattern',
        type: PatternSizeDto,
        isArray: true,
    })
    public sizes: PatternSizeDto;
}

export class PatternsPaginatedPageDto extends PaginatedPageDto {
    @ApiProperty({
        description: 'Paginated patterns',
        type: PatternEntityDto,
        isArray: true,
    })
    public items: PatternEntityDto[];
}
