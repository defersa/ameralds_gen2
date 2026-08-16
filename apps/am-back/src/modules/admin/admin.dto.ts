import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto, NumberEntityDto } from "../../common/common.dto";


export class AdminOrderPatternSizeDto extends BaseEntityDto {}

export class AdminOrderPatternEntityDto extends BaseEntityDto {
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

export class AdminOrderPatternDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Sizes of order pattern',
        type: AdminOrderPatternSizeDto,
        isArray: true,
    })
    public sizes: AdminOrderPatternSizeDto[];

    @ApiProperty({
        description: 'Pattern with prices',
        type: AdminOrderPatternEntityDto,
    })
    public pattern: AdminOrderPatternEntityDto;

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

export class AdminOrderDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Admin order email',
        type: 'string',
        required: false,
    })
    public email?: string;

    @ApiProperty({
        description: 'Admin order complete status',
        type: 'boolean',
    })
    public isComplete: boolean;

    @ApiProperty({
        description: 'Admin order patterns',
        type: AdminOrderPatternDto,
        isArray: true,
    })
    public patterns: AdminOrderPatternDto[];
}

export class AdminOrderResponseDto {
    @ApiProperty({
        description: 'Admin order total price',
        type: NumberEntityDto,
    })
    public price: NumberEntityDto;

    @ApiProperty({
        description: 'Current admin order',
        type: AdminOrderDto,
    })
    public order: AdminOrderDto;
}
