import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto, NumberEntityDto } from "../../common/common.dto";
import { OrderStatus } from "@am/db/entities";
import { PatternEntityDto, PatternSizeDto } from "../patterns/patterns.dto";


export class PatternWithPriceDto extends BaseEntityDto {
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
}

export class BaseShortOrderPatternDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes ids',
        type: 'number',
        isArray: true,
    })
    public sizes: number[];

    @ApiProperty({
        description: 'Status of colors able',
        type: 'boolean',
    })
    public color: boolean;

    @ApiProperty({
        description: 'Status of colors able',
        type: 'boolean',
    })
    public bought: boolean;
}

export class ShortOrderPatternDto extends BaseShortOrderPatternDto {
    @ApiProperty({
        description: 'Pattern with prices',
        type: PatternWithPriceDto,
    })
    public pattern: PatternWithPriceDto;
}

export class InputShortOrderPatternDto extends BaseShortOrderPatternDto {
    @ApiProperty({
        description: 'Pattern id',
        type: 'number',
    })
    public pattern: number;
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

export class UserOrderDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Order status',
        enum: OrderStatus,
        enumName: 'EnumOrderStatus',
    })
    public status: OrderStatus;

    @ApiProperty({
        description: 'Patterns',
        type: ShortOrderPatternDto,
        isArray: true,
    })
    public patterns: ShortOrderPatternDto[];
}
