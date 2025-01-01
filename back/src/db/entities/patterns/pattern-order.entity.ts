import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { PatternEntity } from "./pattern.entity";
import { PatternSizeEntity } from "./pattern-size.entity";
import { UserEntity } from "../user.entity";
import { AdminOrderEntity, UserOrderEntity } from "../purchases/order.entity";


export abstract class SelectedPatternEntity extends BaseModel {
    @ManyToMany(() => PatternSizeEntity)
    @JoinTable()
    public sizes: PatternSizeEntity[];

    @ManyToOne(() => PatternEntity, (pattern: PatternEntity) => pattern.sizes, { onDelete: 'SET NULL', nullable: true })
    public pattern: PatternEntity;

    @Column({ type: 'boolean', default: false })
    public color: boolean;
}


@Entity({ schema: 'patterns' })
export class OrderPatternEntity extends SelectedPatternEntity {
    @ManyToOne(() => UserOrderEntity, (order: UserOrderEntity) => order.patterns, { onDelete: 'SET NULL', nullable: true })
    public order: UserOrderEntity;

    @ManyToOne(() => AdminOrderEntity, (order: AdminOrderEntity) => order.patterns, { onDelete: 'SET NULL', nullable: true })
    public adminOrder: AdminOrderEntity;
}

@Entity({ schema: 'patterns' })
export class UserPatternEntity extends SelectedPatternEntity {
    @ManyToOne(() => UserEntity, (user: UserEntity) => user.ownPatterns, { onDelete: 'SET NULL', nullable: true })
    public user: UserEntity;
}
