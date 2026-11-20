import { ApiProperty } from "@nestjs/swagger";
import { EntityDto, LabelEntityDto, NumberEntityDto, PaginatedPageDto } from "../../common/common.dto";
import { ImageDto } from "../images/images.dto";
import { FileDto } from "../files/files.dto";
import { SizeDto } from "../sizes/sizes.dto";


class BasePatternSizeDto extends EntityDto {
    @ApiProperty({
        description: 'Cbb file id',
        type: 'number',
        nullable: true,
    })
    public cbb: number | null;

    @ApiProperty({
        description: 'Pdf file id',
        type: 'number',
        nullable: true,
    })
    public pdf: number | null;

    @ApiProperty({
        description: 'Png file id',
        type: 'number',
        nullable: true,
    })
    public png: number | null;
}

export class PatternSizeDto extends BasePatternSizeDto {
    @ApiProperty({
        description: 'Size id',
        type: 'number',
    })
    public size: number;
}

export class FullPatternSizeDto extends BasePatternSizeDto {
    @ApiProperty({
        description: 'Size id',
        type: SizeDto,
        nullable: true,
    })
    public size: SizeDto | null;
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

export class BaseEntityDto extends EntityDto {
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
        description: 'Метаданные файла подбора. Приватный путь не раскрывается; скачивание выполняется через защищённую ручку.',
        type: FileDto,
        nullable: true,
    })
    public color: FileDto | null;
}


export class PatternEntityDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes of pattern',
        type: PatternSizeDto,
        isArray: true,
    })
    public sizes: PatternSizeDto[];
}

export class FullPatternEntityDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes of pattern',
        type: FullPatternSizeDto,
        isArray: true,
    })
    public sizes: FullPatternSizeDto[];
}

export class PatternsPaginatedPageDto extends PaginatedPageDto {
    @ApiProperty({
        description: 'Paginated patterns',
        type: PatternEntityDto,
        isArray: true,
    })
    public items: PatternEntityDto[];
}

export class PatternsPaginatedFilterDto {
    @ApiProperty({
        description: 'Pattern size ids',
        type: 'number',
        isArray: true,
        required: false,
    })
    public sizes?: number[];

    @ApiProperty({
        description: 'Pattern category ids',
        type: 'number',
        isArray: true,
        required: false,
    })
    public categories?: number[];

    @ApiProperty({
        description: 'Pattern search query',
        type: 'string',
        required: false,
    })
    public query?: string;
}
