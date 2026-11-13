import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../abstract/abstract.model';
import { UserOrderEntity } from './order.entity';
import { UserPaymentEntity } from './payment.entity';


/** Надёжная очередь действий после коммита; ключ исключает повторное создание одного эффекта. */
@Entity({
    name: 'payment_effect',
    schema: 'users',
})
@Index('uq_payment_effect_key', ['effectKey'], { unique: true })
@Index('idx_payment_effect_due', ['availableAt'], { where: '"completed_at" IS NULL' })
export class PaymentEffectEntity extends BaseModel {
    @Column({
        name: 'effect_key',
        type: 'varchar',
        length: 100,
    })
    public effectKey: string;

    @Column({
        name: 'kind',
        type: 'varchar',
        length: 40,
    })
    public kind: 'purchase_email' | 'cancel_payment' | 'compensation_required';

    @Column({
        name: 'order_id',
        type: 'integer',
    })
    public orderId: number;

    @ManyToOne(() => UserOrderEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({
        name: 'order_id',
        foreignKeyConstraintName: 'fk_payment_effect_order',
    })
    public order: UserOrderEntity;

    @Column({
        name: 'payment_id',
        type: 'integer',
        nullable: true,
    })
    public paymentId: number | null;

    @ManyToOne(() => UserPaymentEntity, {
        onDelete: 'RESTRICT',
        nullable: true,
    })
    @JoinColumn({
        name: 'payment_id',
        foreignKeyConstraintName: 'fk_payment_effect_payment',
    })
    public payment: UserPaymentEntity | null;

    @Column({
        name: 'attempts',
        type: 'integer',
        default: 0,
    })
    public attempts: number;

    @Column({
        name: 'available_at',
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
    })
    public availableAt: Date;

    @Column({
        name: 'completed_at',
        type: 'timestamptz',
        nullable: true,
    })
    public completedAt: Date | null;
}
