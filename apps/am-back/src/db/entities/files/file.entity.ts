import { ChildEntity, Column, Entity, TableInheritance } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";


export enum FileType {
    PUBLIC = 'public',
    PRIVATE = 'private',
}

@Entity()
@TableInheritance({ column: { type: "enum", name: "type", enum: FileType } })
export class FileEntity extends BaseModel {
    @Column({ type: "varchar", length: 400 })
    public path: string;

    @Column({ type: "varchar", length: 200 })
    public name: string;

    @Column({ type: 'boolean', default: false })
    public using: boolean;
}

@ChildEntity(FileType.PUBLIC)
export class PublicFileEntity extends FileEntity {
}

@ChildEntity(FileType.PRIVATE)
export class PrivateFileEntity extends FileEntity {
}
