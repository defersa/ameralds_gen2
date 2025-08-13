import {  Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { LabelLangEntity } from "../common/label-lang.entity";


@Entity({ schema: 'patterns' })
export class CategoryEntity extends BaseModel {
    @OneToOne(() => LabelLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public label: LabelLangEntity;
}
