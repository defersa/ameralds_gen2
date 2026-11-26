import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../abstract/abstract.model';
import { orderAmountTransformer } from './order-snapshot.model';
import { UserOrderEntity } from './order.entity';
import { UserPaymentEntity } from './payment.entity';


export type RefundIncidentKind = 'partial_refund' | 'unexpected_refund' | 'conflicting_refund';

/** Неустранённое расхождение с подтверждёнными данными провайдера; не разрешает автоматический отзыв прав. */
@Entity({ schema: 'users', name: 'refund_incident' })
@Index('idx_refund_incident_order', ['orderId'])
@Index('uq_refund_incident_external', ['provider', 'externalId'], { unique: true })
@Check('chk_refund_incident_amount', '"amount" > 0 AND "amount" <= 9007199254740991')
export class RefundIncidentEntity extends BaseModel {
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

    @Column({ name: 'provider', type: 'varchar', length: 40 })
    public provider: string;

    @Column({ name: 'external_id', type: 'varchar', length: 255 })
    public externalId: string;

    @Column({ name: 'kind', type: 'varchar', length: 40 })
    public kind: RefundIncidentKind;

    @Column({ name: 'amount', type: 'bigint', transformer: orderAmountTransformer })
    public amount: number;

    @Column({ name: 'currency', type: 'varchar', length: 3 })
    public currency: string;

    @Column({ name: 'provider_status', type: 'varchar', length: 20 })
    public providerStatus: string;

    @Column({ name: 'last_observed_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    public lastObservedAt: Date;
}
