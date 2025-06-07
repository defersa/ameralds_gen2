import { BaseModel } from "../../abstract/abstract.model";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { OrderPatternEntity } from "../patterns/pattern-order.entity";
import { UserEntity } from "../user.entity";
import { UserPaymentEntity } from "./payment.entity";


@Entity({ schema: 'users' })
export class AdminOrderEntity extends BaseModel {
    @OneToMany(() => OrderPatternEntity, (pattern: OrderPatternEntity) => pattern.order)
    public patterns: OrderPatternEntity[];

    @Column()
    public email: string;
}

export enum OrderStatus {
    CANCEL = 'cancel',
    OPEN = 'open',
    SUCCESS = 'success',
}

@Entity({ schema: 'users' })
export class UserOrderEntity extends BaseModel {
    @OneToMany(() => OrderPatternEntity, (pattern: OrderPatternEntity) => pattern.order)
    public patterns: OrderPatternEntity[];

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.orders, { onDelete: 'SET NULL', nullable: true })
    public user: UserEntity;

    @OneToOne(() => UserPaymentEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public payment: UserPaymentEntity;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.OPEN,
    })
    public status: OrderStatus;
}
