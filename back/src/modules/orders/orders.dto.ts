import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { BaseEntityDto, EntityDto, LabelEntityDto, NumberEntityDto, PaginatedPageDto } from "../../common/common.dto";
import { ImageDto } from "../images/images.dto";
import { FileDto } from "../files/files.dto";
import { Column, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { PatternEntity, PatternSizeEntity } from "@am/db/entities";
import { PatternEntityDto, PatternSizeDto } from "../patterns/patterns.dto";

// @ManyToMany(() => PatternSizeEntity)
// @JoinTable()
// public sizes: PatternSizeEntity[];
//
// @ManyToOne(() => PatternEntity, (pattern: PatternEntity) => pattern.sizes, { onDelete: 'SET NULL', nullable: true })
// public pattern: PatternEntity;
//
// @Column({ type: 'boolean', default: false })
// public color: boolean;

export class ShortOrderPatternDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes ids',
        type: 'number',
        isArray: true,
    })
    public sizes: number[];

    @ApiProperty({
        description: 'Pattern id',
        type: 'number',
    })
    public pattern: number;

    @ApiProperty({
        description: 'Status of colors able',
        type: 'boolean',
    })
    public color: boolean;
}

export class OrderPatternDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes',
        type: PatternSizeDto,
        isArray: true,
    })
    public sizes: PatternSizeDto[];

    @ApiProperty({
        description: 'Pattern',
        type: PatternEntityDto,
    })
    public pattern: PatternEntityDto;

    @ApiProperty({
        description: 'Status of colors able',
        type: 'boolean',
    })
    public color: boolean;
}
