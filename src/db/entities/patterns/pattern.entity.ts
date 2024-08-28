import { AfterLoad, Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { LabelLangEntity } from "../common/label-lang.entity";
import { TextLangEntity } from "../common/text-lang.entity";
import { FileEntity } from "../files/file.entity";
import { ImageEntity } from "../image/image.entity";
import { CategoryEntity } from "./category.entity";


@Entity()
export class PatternEntity extends BaseModel {
    @OneToOne(() => LabelLangEntity, { onDelete: 'CASCADE'})
    @JoinColumn()
    public name: LabelLangEntity;

    @OneToOne(() => TextLangEntity, { onDelete: 'CASCADE'})
    @JoinColumn()
    public description: TextLangEntity;

    @ManyToMany(() => CategoryEntity)
    @JoinTable({
        name: "pattern_categories",
        joinColumn: {
            name: "pattern",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "category",
            referencedColumnName: "id"
        }
    })
    public categories: CategoryEntity[];

    @ManyToMany(() => ImageEntity)
    @JoinTable({
        name: "pattern_images",
        joinColumn: {
            name: "pattern",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "image",
            referencedColumnName: "id"
        }
    })
    public images: ImageEntity[];

    @OneToOne(() => FileEntity, { onDelete: 'CASCADE'})
    @JoinColumn({ foreignKeyConstraintName: 'patternColor' })
    public color: FileEntity;

    @Column({ type: 'boolean', default: false })
    public hidden: boolean;

    @Column({ type: 'int', default: 0 })
    public views: number;

    @AfterLoad()
    private updateViews() {
        this.views++;
    }
}
