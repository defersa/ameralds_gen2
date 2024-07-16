import { Column, Entity, OneToMany } from "typeorm";
import { BaseModel } from "@am/db/abstract/abstract.model";
import { TokenAccessEntity } from "@am/db/entities/tokens/token-access.entity";
import { TokenRefreshEntity } from "@am/db/entities/tokens/token-refresh.entity";


export enum UserStatus {
    REGISTERED = 'registered',
    VERIFIED = 'verified',
}

export enum UserRole {
    COMMON = 'common',
    ADMIN = 'admin',
}

@Entity()
export class UserEntity extends BaseModel {
    @OneToMany(() => TokenAccessEntity, (token: TokenAccessEntity) => token.user)
    public access: TokenAccessEntity[];

    @OneToMany(() => TokenRefreshEntity, (token: TokenRefreshEntity) => token.user)
    public refresh: TokenRefreshEntity[];

    @Column({ nullable: true })
    public username: string;

    @Column({ unique: true })
    public email: string;

    @Column()
    public passwordHash: string;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.REGISTERED,
    })
    public status: UserStatus;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.COMMON,
    })
    public role: UserRole;
}
