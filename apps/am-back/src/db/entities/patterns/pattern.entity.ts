import { AfterLoad, Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";
import { LabelLangEntity } from "../common/label-lang.entity";
import { TextLangEntity } from "../common/text-lang.entity";
import { PrivateFileEntity } from "../files/file.entity";
import { ImageEntity } from "../image/image.entity";
import { CategoryEntity } from "./category.entity";
import { PatternSizeEntity } from "./pattern-size.entity";
import { NumberLangEntity } from "../common/number-lang.entity";
import { OrderPatternEntity, SelectedPatternEntity, UserPatternEntity } from "./pattern-order.entity";


@Entity({ schema: 'patterns' })
export class PatternEntity extends BaseModel {
    @OneToOne(() => LabelLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public name: LabelLangEntity;

    @OneToOne(() => TextLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public description: TextLangEntity;

    @OneToOne(() => NumberLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public basePrice: NumberLangEntity;

    @OneToOne(() => NumberLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public additionalPrice: NumberLangEntity;

    @OneToOne(() => NumberLangEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    public colorPrice: NumberLangEntity;

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

    @OneToMany(() => PatternSizeEntity, (size: PatternSizeEntity) => size.pattern)
    public sizes: PatternSizeEntity[];

    @OneToMany(() => OrderPatternEntity, (order: OrderPatternEntity) => order.pattern)
    public orders: OrderPatternEntity[];

    @OneToMany(() => UserPatternEntity, (order: UserPatternEntity) => order.pattern)
    public own: UserPatternEntity[];

    @OneToOne(() => PrivateFileEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ foreignKeyConstraintName: 'patternColor' })
    public color: PrivateFileEntity;

    @Column({ type: 'boolean', default: false })
    public hidden: boolean;

    @Column({ type: 'int', default: 0 })
    public views: number;

    @AfterLoad()
    private updateViews() {
        this.views++;
    }
}
