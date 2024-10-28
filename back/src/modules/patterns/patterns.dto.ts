import { ApiProperty } from "@nestjs/swagger";
import { EntityDto, LabelEntityDto, PaginatedPageDto } from "../../common/common.dto";
import { ImageDto } from "../images/images.dto";
import { FileDto } from "../files/files.dto";
import { OneToOne } from "typeorm";
import { PrivateFileEntity } from "@am/db/entities";


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
}

export class PatternsPaginatedPageDto extends PaginatedPageDto {
    @ApiProperty({
        description: 'Paginated patterns',
        type: PatternEntityDto,
        isArray: true,
    })
    public items: PatternEntityDto[];
}

export class CreatePatternSizeDto extends EntityDto {
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
