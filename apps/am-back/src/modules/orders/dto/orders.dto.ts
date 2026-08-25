import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto, NumberEntityDto } from "../../../common/common.dto";
import { PatternEntityDto, PatternSizeDto } from "../../patterns/patterns.dto";
import { OrderStatus } from '../../../db/entities/purchases/order.entity';


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
        description: 'Whether base pattern purchase should be included',
        type: 'boolean',
    })
    public requiresPatternPurchase: boolean;
}

export class ShortOrderPatternDto extends BaseShortOrderPatternDto {
    @ApiProperty({
        description: 'Pattern with prices',
        type: PatternWithPriceDto,
    })
    public pattern: PatternWithPriceDto;
}

export class InputShortOrderPatternDto {
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
        description: 'Pattern id',
        type: 'number',
    })
    public pattern: number;

    @ApiProperty({
        description: 'Whether base pattern purchase should be included',
        type: 'boolean',
    })
    public requiresPatternPurchase: boolean;
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

export class CartOrderPatternSizeDto extends BaseEntityDto {}

export class CartOrderPatternEntityDto extends PatternWithPriceDto {}

export class CartOrderPatternDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes selected in cart',
        type: CartOrderPatternSizeDto,
        isArray: true,
    })
    public sizes: CartOrderPatternSizeDto[];

    @ApiProperty({
        description: 'Pattern with prices',
        type: CartOrderPatternEntityDto,
    })
    public pattern: CartOrderPatternEntityDto;

    @ApiProperty({
        description: 'Status of colors able',
        type: 'boolean',
    })
    public color: boolean;

    @ApiProperty({
        description: 'Whether base pattern purchase should be included',
        type: 'boolean',
    })
    public requiresPatternPurchase: boolean;
}

export class CartOrderDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Order status',
        enum: OrderStatus,
        enumName: 'EnumOrderStatus',
    })
    public status: OrderStatus;

    @ApiProperty({
        description: 'Patterns in cart',
        type: CartOrderPatternDto,
        isArray: true,
    })
    public patterns: CartOrderPatternDto[];
}

export class CartDto {
    @ApiProperty({
        description: 'Cart total price',
        type: NumberEntityDto,
    })
    public price: NumberEntityDto;

    @ApiProperty({
        description: 'Current user order',
        type: CartOrderDto,
    })
    public order: CartOrderDto;
}
