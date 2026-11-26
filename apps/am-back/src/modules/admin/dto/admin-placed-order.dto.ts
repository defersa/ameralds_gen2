import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';
import { PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserOrderDetailsDto } from '@am-back/modules/orders/dto/orders.dto';
import { UserOrderSummaryDto } from '@am-back/modules/orders/dto/user-orders-list.dto';


export class AdminPlacedOrdersQueryDto {
    @ApiPropertyOptional({
        type: 'integer',
        minimum: 1,
        maximum: 2147483647,
        default: 1,
    })
    public page?: number;

    @ApiPropertyOptional({
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
    })
    public pageSize?: number;

    @ApiPropertyOptional({
        description: 'Статусы через запятую: pending_payment,success,cancel,refunded; open запрещён',
    })
    public statuses?: string;

    @ApiPropertyOptional({
        maxLength: 254,
        description: 'Часть email либо точный ID пользователя',
    })
    public user?: string;

    @ApiPropertyOptional({
        type: String,
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Первый день создания включительно, YYYY-MM-DD, UTC',
    })
    public from?: string;

    @ApiPropertyOptional({
        type: String,
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Последний день создания целиком, YYYY-MM-DD, UTC',
    })
    public to?: string;
}

export class OrderActionDto {
    @ApiProperty({
        minLength: 1,
        maxLength: 2000,
        description: 'Обязательная причина; дополнительные поля, в том числе сумма и позиции, запрещены',
    })
    public reason: string;
}

export class OrderCustomerDto {
    @ApiProperty()
    public id: number;

    @ApiProperty()
    public email: string;
}

export class AdminPlacedOrderSummaryDto extends UserOrderSummaryDto {
    @ApiProperty({
        type: OrderCustomerDto,
        nullable: true,
    })
    public user: OrderCustomerDto | null;
}

export class AdminPlacedOrdersPageDto {
    @ApiProperty({
        type: AdminPlacedOrderSummaryDto,
        isArray: true,
    })
    public items: AdminPlacedOrderSummaryDto[];

    @ApiProperty()
    public page: number;

    @ApiProperty()
    public pageSize: number;

    @ApiProperty({ description: 'Общее число результатов' })
    public total: number;

    @ApiProperty({ description: 'Число страниц, минимум 1' })
    public count: number;
}

export class AdminOrderPaymentDto {
    @ApiProperty()
    public id: number;

    @ApiProperty()
    public provider: string;

    @ApiProperty({
        type: String,
        nullable: true,
    })
    public externalId: string | null;

    @ApiProperty({
        enum: PaymentStatus,
        enumName: 'EnumPaymentStatus',
        nullable: true,
    })
    public status: PaymentStatus | null;

    @ApiProperty({
        type: Number,
        nullable: true,
    })
    public amount: number | null;

    @ApiProperty({
        type: String,
        nullable: true,
    })
    public currency: string | null;

    @ApiProperty({
        type: String,
        nullable: true,
    })
    public resolution: string | null;

    @ApiProperty()
    public createdAt: Date;

    @ApiProperty({
        type: Date,
        nullable: true,
    })
    public paidAt: Date | null;
}

export class AdminOrderHistoryDto {
    @ApiProperty()
    public event: string;

    @ApiProperty()
    public at: Date;

    @ApiProperty({
        type: Number,
        nullable: true,
    })
    public actorId: number | null;

    @ApiProperty({
        type: String,
        nullable: true,
    })
    public reason: string | null;
}

export class AdminOrderRefundDto {
    @ApiProperty()
    public id: number;

    @ApiProperty({
        enum: ['accepted', 'processing', 'unknown', 'succeeded', 'failed'],
    })
    public status: string;

    @ApiProperty()
    public amount: number;

    @ApiProperty()
    public currency: string;

    @ApiProperty()
    public paymentId: number;

    @ApiProperty({
        type: String,
        nullable: true,
    })
    public externalId: string | null;

    @ApiProperty({ type: Number, nullable: true })
    public initiatedBy: number | null;

    @ApiProperty({ enum: ['application', 'provider'] })
    public origin: 'application' | 'provider';

    @ApiProperty()
    public reason: string;

    @ApiProperty()
    public createdAt: Date;

    @ApiProperty({
        type: Date,
        nullable: true,
    })
    public completedAt: Date | null;

    @ApiProperty({
        type: String,
        nullable: true,
    })
    public errorCode: string | null;
}

export class AdminRefundIncidentDto {
    @ApiProperty()
    public id: number;

    @ApiProperty()
    public paymentId: number;

    @ApiProperty()
    public provider: string;

    @ApiProperty()
    public externalId: string;

    @ApiProperty({ enum: ['partial_refund', 'unexpected_refund', 'conflicting_refund'] })
    public kind: string;

    @ApiProperty()
    public amount: number;

    @ApiProperty()
    public currency: string;

    @ApiProperty()
    public providerStatus: string;

    @ApiProperty()
    public createdAt: Date;

    @ApiProperty()
    public lastObservedAt: Date;
}

export class AdminPlacedOrderDetailsDto extends UserOrderDetailsDto {
    @ApiProperty({ type: AdminRefundIncidentDto, isArray: true, description: 'Финансовые расхождения для ручного разбора; автоматический повтор возврата заблокирован' })
    public refundIncidents: AdminRefundIncidentDto[];

    @ApiProperty({
        type: OrderCustomerDto,
        nullable: true,
    })
    public user: OrderCustomerDto | null;

    @ApiProperty({
        type: AdminOrderPaymentDto,
        isArray: true,
    })
    public payments: AdminOrderPaymentDto[];

    @ApiProperty({
        type: AdminOrderRefundDto,
        isArray: true,
    })
    public refunds: AdminOrderRefundDto[];

    @ApiProperty({
        type: AdminOrderHistoryDto,
        isArray: true,
    })
    public history: AdminOrderHistoryDto[];

    @ApiProperty({
        type: String,
        nullable: true,
        description: 'Причина недоступности полного возврата; null означает предварительную доступность',
    })
    public refundUnavailableReason: string | null;

    @ApiProperty({
        type: Number,
        isArray: true,
        description: 'ID схем, теряющих последний размер и доступ к подбору цвета при возврате',
    })
    public colorAccessWarnings: number[];

    @ApiProperty()
    public canCancel: boolean;

    @ApiProperty({
        enum: OrderStatus,
        enumName: 'EnumOrderStatus',
    })
    public override status: OrderStatus;
}
