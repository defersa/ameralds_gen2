import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../abstract/abstract.model';
import { UserEntity } from '../user.entity';
import { orderAmountTransformer, type OrderCurrency } from './order-snapshot.model';
import { UserOrderEntity } from './order.entity';
import { UserPaymentEntity } from './payment.entity';


export type RefundStatus = 'accepted' | 'processing' | 'unknown' | 'succeeded' | 'failed';

export interface RefundTransition {
    status: RefundStatus;
    at: string;
    error: string | null;
}

/** Журнал финансового возврата: состояние оплаты и история заказа сохраняются отдельно. */
@Entity({ schema: 'users', name: 'refund' })
@Index('uq_refund_idempotency', ['idempotencyKey'], { unique: true })
@Index('uq_refund_external', ['provider', 'externalId'], { unique: true, where: '"external_id" IS NOT NULL' })
@Index('uq_refund_active_order', ['orderId'], { unique: true, where: '"status" IN (\'accepted\', \'processing\', \'unknown\', \'succeeded\')' })
@Index('idx_refund_due', ['nextCheckAt'], { where: '"status" IN (\'accepted\', \'processing\', \'unknown\')' })
@Check('chk_refund_amount', '"amount" > 0 AND "amount" <= 9007199254740991')
@Check('chk_refund_currency', '"currency" IN (\'RUB\', \'USD\')')
@Check('chk_refund_status', '"status" IN (\'accepted\', \'processing\', \'unknown\', \'succeeded\', \'failed\')')
@Check('chk_refund_reason', 'length(trim("reason")) > 0')
@Check('chk_refund_origin', "(origin = 'application' AND initiated_by IS NOT NULL) OR (origin = 'provider' AND initiated_by IS NULL AND external_id IS NOT NULL AND status <> 'accepted')")
export class RefundEntity extends BaseModel {
    @Column({ name: 'order_id', type: 'integer' })
    public orderId: number;

    @ManyToOne(() => UserOrderEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'order_id' })
    public order: UserOrderEntity;

    @Column({ name: 'payment_id', type: 'integer' })
    public paymentId: number;

    @ManyToOne(() => UserPaymentEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'payment_id' })
    public payment: UserPaymentEntity;

    @Column({ name: 'origin', type: 'varchar', length: 20, default: 'application' })
    public origin: 'application' | 'provider';

    @Column({ name: 'initiated_by', type: 'integer', nullable: true })
    public initiatedBy: number | null;

    @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', nullable: true })
    @JoinColumn({ name: 'initiated_by' })
    public initiator: UserEntity | null;

    @Column({ type: 'text' })
    public reason: string;

    @Column({ type: 'bigint', transformer: orderAmountTransformer })
    public amount: number;

    @Column({ type: 'varchar', length: 3 })
    public currency: OrderCurrency;

    @Column({ type: 'varchar', length: 40 })
    public provider: string;

    @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
    public externalId: string | null;

    @Column({ name: 'idempotency_key', type: 'uuid' })
    public idempotencyKey: string;

    @Column({ type: 'varchar', length: 20 })
    public status: RefundStatus;

    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    public transitions: RefundTransition[];

    @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
    public errorCode: string | null;

    @Column({ name: 'next_check_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    public nextCheckAt: Date;

    @Column({ name: 'check_failures', type: 'integer', default: 0 })
    public checkFailures: number;

    @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
    public completedAt: Date | null;
}
