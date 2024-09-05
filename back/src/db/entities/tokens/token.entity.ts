import { Column, Entity, TableInheritance } from "typeorm";
import { BaseModel } from "../../abstract/abstract.model";


export enum TokenType {
    ACCESS = 'access',
    REFRESH = 'refresh',
    VERIFY = 'verify',
}

@Entity()
@TableInheritance({ column: { type: "enum", name: "type", enum: TokenType } })
export class TokenEntity extends BaseModel {
    @Column()
    public expiredAt: Date;

    @Column({ length: 300 })
    public value: string;
}
