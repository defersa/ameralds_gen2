import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class TextLangEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ length: 2047 })
    public ru: string;

    @Column({ length: 2047 })
    public en: string;
}
