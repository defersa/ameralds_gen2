import { MAX_PAGE_NUMBER } from '@ameralds/utils';
import { PaginatedPageDto } from '@am-back/common/common.dto';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { UserOrderDetailsDto } from './orders.dto';


export class UserOrdersQueryDto {
    @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: MAX_PAGE_NUMBER, default: 1 })
    public page?: number;

    @ApiPropertyOptional({ enum: OrderStatus, enumName: 'EnumOrderStatus', description: 'Статус оформленного заказа; open недопустим' })
    public status?: OrderStatus;

    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Дата создания от, включительно' })
    public createdFrom?: string;

    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Дата создания до, исключительно' })
    public createdBefore?: string;

    @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER, description: 'Минимальная итоговая сумма в копейках/центах валюты заказа, включительно' })
    public minAmount?: number;

    @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER, description: 'Максимальная итоговая сумма в копейках/центах валюты заказа, включительно' })
    public maxAmount?: number;
}

export class UserOrderSummaryDto extends OmitType(UserOrderDetailsDto, ['patterns', 'discounts'] as const) {}

export class UserOrdersPageDto extends PaginatedPageDto {
    @ApiProperty({
        type: UserOrderSummaryDto,
        isArray: true,
        description: 'Основные поля оформленных заказов текущего пользователя без позиций, скидочных снимков и связей, новые первыми',
    })
    public items: UserOrderSummaryDto[];
}
