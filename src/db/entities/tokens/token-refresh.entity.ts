import { ChildEntity, ManyToOne } from "typeorm";
import { TokenEntity, TokenType } from "./token.entity";
import { UserEntity } from "../user.entity";


@ChildEntity(TokenType.REFRESH)
export class TokenRefreshEntity extends TokenEntity {
    @ManyToOne(() => UserEntity)
    public user: UserEntity;
}
