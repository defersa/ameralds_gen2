import { PaymentStatus } from '@am-back/db/entities/purchases/payment.entity';
import type { OrderCurrency } from '@am-back/db/entities/purchases/order-snapshot.model';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@am-back/db/entities/purchases/order.entity';


export class CreatePaymentDto {
    @ApiProperty({
        type: String,
        format: 'uuid',
        description:
            'UUID одной попытки; сохраняйте при сетевых ошибках. Новый ключ нужен только после FAILED/CANCELLED.',
    })
    public idempotencyKey: string;
}

export class PaymentAttemptDto {
    @ApiProperty({ type: 'integer' })
    public id: number;

    @ApiProperty({ type: 'integer' })
    public orderId: number;

    @ApiProperty({
        enum: PaymentStatus,
        enumName: 'EnumPaymentStatus',
    })
    public status: PaymentStatus;

    @ApiProperty({
        type: 'integer',
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
        description: 'Серверная сумма в копейках/центах',
    })
    public amount: number;

    @ApiProperty({
        enum: ['RUB', 'USD'],
    })
    public currency: OrderCurrency;

    @ApiProperty({
        type: String,
        nullable: true,
        description: 'Ссылка провайдера; переход по ней не подтверждает оплату',
    })
    public confirmationUrl: string | null;

    @ApiProperty({ type: Date })
    public createdAt: Date;

    @ApiProperty({
        type: Date,
        nullable: true,
    })
    public paidAt: Date | null;

    @ApiProperty({
        type: Boolean,
        description: 'Тестовый провайдер: денежные средства не списываются',
    })
    public testMode: boolean;
}

export class PaymentStateDto {
    @ApiProperty({ type: 'integer' })
    public orderId: number;

    @ApiProperty({
        enum: OrderStatus,
        enumName: 'EnumOrderStatus',
    })
    public orderStatus: OrderStatus;

    @ApiProperty({
        enum: PaymentStatus,
        enumName: 'EnumPaymentStatus',
        nullable: true,
    })
    public paymentStatus: PaymentStatus | null;

    @ApiProperty({
        type: String,
        enum: ['completed', 'compensation_required'],
        nullable: true,
    })
    public resolution: 'completed' | 'compensation_required' | null;

    @ApiProperty({
        type: Date,
        nullable: true,
    })
    public checkedAt: Date | null;

    @ApiProperty({
        type: Boolean,
        description: 'API провайдера временно недоступен; успех не подтверждён.',
    })
    public verificationUnavailable: boolean;
}
