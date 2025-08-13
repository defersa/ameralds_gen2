import { Column, Entity, OneToMany } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { PatternSizeEntity } from "./pattern-size.entity";


@Entity({ schema: 'patterns' })
export class SizeEntity extends BaseModel {
    @Column({ type: 'int' })
    public value: number;

    @OneToMany(() => PatternSizeEntity, (size: PatternSizeEntity) => size.pattern)
    public sizes: PatternSizeEntity[];
}
