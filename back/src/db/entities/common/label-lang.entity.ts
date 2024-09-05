import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class LabelLangEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ length: 255 })
    public ru: string;

    @Column({ length: 255 })
    public en: string;
}
