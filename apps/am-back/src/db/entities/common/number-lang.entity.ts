import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class NumberLangEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "decimal" })
    public ru: number;

    @Column({ type: "decimal" })
    public en: number;
}
