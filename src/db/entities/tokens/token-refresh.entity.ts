import { ChildEntity, ManyToOne } from "typeorm";
import { TokenEntity, TokenType } from "@am/db/entities/tokens/token.entity";
import { UserEntity } from "@am/db/entities/user.entity";


@ChildEntity(TokenType.REFRESH)
export class TokenRefreshEntity extends TokenEntity {
    @ManyToOne(() => UserEntity)
    public user: UserEntity;
}
