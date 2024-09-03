import { Entity, ManyToOne, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { SizeEntity } from "./size.entity";
import { PatternEntity } from "./pattern.entity";
import { FileEntity } from "../files/file.entity"


@Entity({ schema: 'patterns' })
export class PatternSizeEntity extends BaseModel {
    @ManyToOne(() => SizeEntity, { onDelete: 'CASCADE' })
    public size: SizeEntity;

    @ManyToOne(() => PatternEntity, { onDelete: 'CASCADE' })
    public pattern: PatternEntity;

    @OneToOne(() => FileEntity, { onDelete: 'CASCADE', nullable: true })
    public cbb: FileEntity;

    @OneToOne(() => FileEntity, { onDelete: 'CASCADE', nullable: true })
    public pdf: FileEntity;

    @OneToOne(() => FileEntity, { onDelete: 'CASCADE', nullable: true })
    public png: FileEntity;

    @OneToOne(() => FileEntity, { onDelete: 'CASCADE', nullable: true })
    public jbb: FileEntity;
}
