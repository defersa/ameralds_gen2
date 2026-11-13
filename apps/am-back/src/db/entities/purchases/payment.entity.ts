import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseModel } from '../../abstract/abstract.model';
import { NumberLangEntity } from '../common/number-lang.entity';
import { UserOrderEntity } from './order.entity';
import { orderAmountTransformer, type OrderCurrency } from './order-snapshot.model';


export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

@Entity({
    name: 'user_payment_entity',
    schema: 'users',
})
@Index('idx_payment_order', ['orderId'])
@Index('idx_payment_reconciliation', ['nextCheckAt'], { where: '"provider" <> \'legacy\'' })
@Index('uq_payment_idempotency', ['idempotencyKey'], { unique: true })
@Index('uq_payment_external', ['provider', 'externalId'], {
    unique: true,
    where: '"external_id" IS NOT NULL',
})
@Index('uq_payment_pending_order', ['orderId'], {
    unique: true,
    where: '"status" = \'PENDING\'',
})
@Check('chk_payment_status', "\"status\" IS NULL OR \"status\" IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED')")
@Check('chk_payment_amount', '"amount" IS NULL OR ("amount" > 0 AND "amount" <= 9007199254740991)')
@Check('chk_payment_currency', '"currency" IS NULL OR "currency" IN (\'RUB\', \'USD\')')
@Check('chk_payment_resolution', '"resolution" IS NULL OR ("status" = \'SUCCEEDED\' AND "resolution" IN (\'completed\', \'compensation_required\'))')
@Check('chk_payment_check_failures', '"check_failures" >= 0')
@Check(
    'chk_payment_capture',
    '"provider" = \'legacy\' OR (("status" = \'SUCCEEDED\' AND "paid_at" IS NOT NULL) OR ("status" <> \'SUCCEEDED\' AND "paid_at" IS NULL))',
)
@Check(
    'chk_payment_required',
    '"provider" = \'legacy\' OR ("order_id" IS NOT NULL AND "status" IS NOT NULL AND "amount" IS NOT NULL AND "currency" IS NOT NULL AND "idempotency_key" IS NOT NULL)',
)
export class UserPaymentEntity extends BaseModel {
    @Column({ name: 'resolution', type: 'varchar', length: 40, nullable: true })
    public resolution: 'completed' | 'compensation_required' | null;

    @Column({ name: 'next_check_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    public nextCheckAt: Date;

    @Column({ name: 'check_failures', type: 'integer', default: 0 })
    public checkFailures: number;

    // Время первого сохранения конечного статуса; повторная сверка и backoff не продлевают окно поздних списаний.
    @Column({
        name: 'terminal_at',
        type: 'timestamptz',
        nullable: true,
    })
    public terminalAt: Date | null;

    // Историческая двуязычная цена сохраняется исключительно для аудита.
    @OneToOne(() => NumberLangEntity, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'totalPriceId' })
    public totalPrice: NumberLangEntity | null;

    @Column({
        name: 'order_id',
        type: 'integer',
        nullable: true,
    })
    public orderId: number | null;

    @ManyToOne(() => UserOrderEntity, (order: UserOrderEntity) => order.payments, {
        onDelete: 'RESTRICT',
        nullable: true,
    })
    @JoinColumn({
        name: 'order_id',
        foreignKeyConstraintName: 'fk_payment_order',
    })
    public order: UserOrderEntity | null;

    @Column({
        name: 'provider',
        type: 'varchar',
        length: 40,
        default: 'legacy',
    })
    public provider: string;

    @Column({
        name: 'external_id',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    public externalId: string | null;

    @Column({
        name: 'idempotency_key',
        type: 'uuid',
        nullable: true,
    })
    public idempotencyKey: string | null;

    // NULL у legacy означает неизвестный финансовый результат, а не успешное списание.
    @Column({
        name: 'status',
        type: 'varchar',
        length: 20,
        nullable: true,
    })
    public status: PaymentStatus | null;

    @Column({
        name: 'amount',
        type: 'bigint',
        nullable: true,
        transformer: orderAmountTransformer,
    })
    public amount: number | null;

    @Column({
        name: 'currency',
        type: 'varchar',
        length: 3,
        nullable: true,
    })
    public currency: OrderCurrency | null;

    @Column({
        name: 'confirmation_url',
        type: 'text',
        nullable: true,
    })
    public confirmationUrl: string | null;

    @Column({
        name: 'provider_status',
        type: 'varchar',
        length: 40,
        nullable: true,
    })
    public providerStatus: string | null;

    @Column({
        name: 'paid_at',
        type: 'timestamptz',
        nullable: true,
    })
    public paidAt: Date | null;

    @Column({
        name: 'checked_at',
        type: 'timestamptz',
        nullable: true,
    })
    public checkedAt: Date | null;

    @Column({
        name: 'error_code',
        type: 'varchar',
        length: 40,
        nullable: true,
    })
    public errorCode: string | null;
}
