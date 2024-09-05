import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


export enum ModelState {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export abstract class BaseModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({
        type: 'enum',
        enum: ModelState,
        default: ModelState.ACTIVE,
    })
    public state: ModelState;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
