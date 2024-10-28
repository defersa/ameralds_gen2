import { Column, Entity } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";


@Entity()
export class ImageEntity extends BaseModel {
    @Column({ type: "varchar", width: 200 })
    public name: string;

    @Column({ type: "varchar", width: 200 })
    public preview: string;

    @Column({ type: "varchar", width: 200 })
    public full: string;

    @Column({ type: 'boolean', default: false })
    public using: boolean;

    @Column({ type: 'int', default: 0 })
    public index: number;
}
