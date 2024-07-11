import { Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class Token {
    @PrimaryGeneratedColumn()
    id: number;

    public value(): void {

    }
}
