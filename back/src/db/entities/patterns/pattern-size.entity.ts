import { Entity, ManyToOne, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { SizeEntity } from "./size.entity";
import { PatternEntity } from "./pattern.entity";
import { PrivateFileEntity } from "../files/file.entity";


@Entity({ schema: 'patterns' })
export class PatternSizeEntity extends BaseModel {
    @ManyToOne(() => SizeEntity, { onDelete: 'CASCADE' })
    public size: SizeEntity;

    @ManyToOne(() => PatternEntity, (pattern: PatternEntity) => pattern.sizes, { onDelete: 'CASCADE' })
    public pattern: PatternEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    public cbb: PrivateFileEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    public pdf: PrivateFileEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    public png: PrivateFileEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    public jbb: PrivateFileEntity;
}
