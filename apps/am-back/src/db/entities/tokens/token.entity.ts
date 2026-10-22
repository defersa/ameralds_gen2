import { Column, Entity, Index, TableInheritance } from "typeorm";
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

    @Index('IDX_token_value', { unique: true })
    @Column({ length: 300 })
    public value: string;

    @Index('IDX_token_session')
    @Column({ type: 'uuid', nullable: true })
    public sessionId: string;
}
