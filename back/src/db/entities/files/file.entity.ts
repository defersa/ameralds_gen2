import { Column, Entity } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";


@Entity()
export class FileEntity extends BaseModel {
    @Column({ type: "varchar", width: 200 })
    public path: string;
}
