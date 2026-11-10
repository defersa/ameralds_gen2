import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserPaymentEntity } from './payment.entity';


// Разные вкладки могут прислать разные UUID к одной активной попытке: каждый повтор должен помнить исходный результат.
@Entity({
    name: 'payment_request',
    schema: 'users',
})
export class PaymentRequestEntity {
    @PrimaryColumn({
        name: 'idempotency_key',
        type: 'uuid',
        primaryKeyConstraintName: 'pk_payment_request_key',
    })
    public idempotencyKey: string;

    @Column({
        name: 'payment_id',
        type: 'integer',
    })
    public paymentId: number;

    @ManyToOne(() => UserPaymentEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({
        name: 'payment_id',
        foreignKeyConstraintName: 'fk_payment_request_attempt',
    })
    public payment: UserPaymentEntity;
}
