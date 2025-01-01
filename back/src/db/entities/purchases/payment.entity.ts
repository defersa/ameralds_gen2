import { Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { NumberLangEntity } from "../common/number-lang.entity";


@Entity({ schema: 'users' })
export class UserPaymentEntity extends BaseModel {
    @OneToOne(() => NumberLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public totalPrice: NumberLangEntity;
}
