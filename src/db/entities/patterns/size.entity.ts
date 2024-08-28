import { Column, Entity } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";


@Entity()
export class SizeEntity extends BaseModel {
    @Column({ type: 'int' })
    public value: number;
}
