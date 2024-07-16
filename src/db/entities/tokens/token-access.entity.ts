import { ChildEntity, ManyToOne } from "typeorm";
import { TokenEntity, TokenType } from "@am/db/entities/tokens/token.entity";
import { UserEntity } from "@am/db/entities/user.entity";


@ChildEntity(TokenType.ACCESS)
export class TokenAccessEntity extends TokenEntity {
    @ManyToOne(() => UserEntity)
    public user: UserEntity;
}
