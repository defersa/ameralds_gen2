import { Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { SizeEntity } from "./size.entity";
import { PatternEntity } from "./pattern.entity";
import { PrivateFileEntity } from "../files/file.entity";


@Entity({ schema: 'patterns' })
export class PatternSizeEntity extends BaseModel {
    @ManyToOne(() => SizeEntity, { onDelete: 'SET NULL', nullable: true })
    public size: SizeEntity;

    @ManyToOne(() => PatternEntity, (pattern: PatternEntity) => pattern.sizes, { onDelete: 'SET NULL', nullable: true })
    public pattern: PatternEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ foreignKeyConstraintName: 'cbbFile' })
    public cbb: PrivateFileEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ foreignKeyConstraintName: 'pdfFile' })
    public pdf: PrivateFileEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ foreignKeyConstraintName: 'pngFile' })
    public png: PrivateFileEntity;

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ foreignKeyConstraintName: 'jbbFile' })
    public jbb: PrivateFileEntity;
}
