import { ApiProperty, OmitType } from "@nestjs/swagger";
import { BaseEntityDto, LabelEntityDto, NumberEntityDto, PaginatedPageDto } from "../../common/common.dto";
import { SizeDto } from '../sizes/sizes.dto';


export class AdminOrderPatternSizeDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Selected size',
        type: SizeDto,
    })
    public size: SizeDto;
}

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
        description: 'Admin order VK',
        type: 'string',
        required: false,
    })
    public vk?: string;

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

export class AdminOrderPatternNameDto {
    @ApiProperty({
        description: 'Name of the ordered pattern',
        type: LabelEntityDto,
        nullable: true,
    })
    public name: LabelEntityDto | null;
}

export class AdminOrderListDto extends OmitType(AdminOrderDto, ['patterns'] as const) {
    @ApiProperty({
        description: 'Names of the ordered patterns',
        type: AdminOrderPatternNameDto,
        isArray: true,
    })
    public patterns: AdminOrderPatternNameDto[];
}

export class AdminOrdersPaginatedPageDto extends PaginatedPageDto {
    @ApiProperty({
        description: 'Paginated admin orders',
        type: AdminOrderListDto,
        isArray: true,
    })
    public items: AdminOrderListDto[];
}

export class AdminOrdersPaginatedFilterDto {
    @ApiProperty({
        description: 'Admin order email search',
        type: 'string',
        required: false,
    })
    public email?: string;

    @ApiProperty({
        description: 'Admin order VK search',
        type: 'string',
        required: false,
    })
    public vk?: string;

    @ApiProperty({
        description: 'Earliest admin order creation date (inclusive)',
        type: 'string',
        format: 'date-time',
        required: false,
    })
    public startDate?: string;

    @ApiProperty({
        description: 'Latest admin order creation date (inclusive)',
        type: 'string',
        format: 'date-time',
        required: false,
    })
    public endDate?: string;
}

export class CompleteAdminOrderDto {
    @ApiProperty({
        description: 'Email to save on the completed admin order',
        type: 'string',
        required: false,
    })
    public email?: string;

    @ApiProperty({
        description: 'VK to save on the completed admin order',
        type: 'string',
        required: false,
    })
    public vk?: string;
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
